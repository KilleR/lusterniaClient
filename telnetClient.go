package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"io/ioutil"
	"log"
	"lusterniaClient/telnet"
	"net"
	"regexp"
	"sync"
	"syscall"
	"time"
)

var ansiRex map[string]*regexp.Regexp

func init() {
	start := "\u001B\\["
	ansiRex = make(map[string]*regexp.Regexp)
	ansiRex["all"] = regexp.MustCompile(start + `([^m]+)m`)
	ansiRex["basic"] = regexp.MustCompile(start + `([0-9]{2,3});?([0-9]{2,3})m`)
	ansiRex["basic_bright"] = regexp.MustCompile(start + `1;([0-9]{2,3})m`)
	ansiRex["fg_bright"] = regexp.MustCompile(start + `([0-9]+)m`)
}

func ansiToRGB(code int) (rgb string) {
	if code == 0 {
		return "#000000"
	}
	if code == 1 {
		return "#800000"
	}
	if code == 2 {
		return "#00b300"
	}
	if code == 3 {
		return "#808000"
	}
	if code == 4 {
		return "#0000a0"
	}
	if code == 5 {
		return "#800080"
	}
	if code == 6 {
		return "#008080"
	}
	if code == 7 {
		return "#aaaaaa"
	}

	if code == 8 {
		return "#464646"
	}
	if code == 9 {
		return "#ff0000"
	}
	if code == 10 {
		return "#00ff00"
	}
	if code == 11 {
		return "#ffff00"
	}
	if code == 12 {
		return "#0000ff"
	}
	if code == 13 {
		return "#ff00ff"
	}
	if code == 14 {
		return "#00ffff"
	}
	if code == 15 {
		return "#ffffff"
	}
	return "#000000"
}

func ansiToHtml(raw []byte) []byte {
	bytes.Contains(raw, []byte(`\u001b\[0m`))

	//for key,rex := range ansiRex {
	//
	//	res := rex.FindAllSubmatch(raw, -1)
	//	for _, v := range res {
	//		log.Println("found ANSI "+key+":", string(v[1]))
	//	}
	//}
	return raw
}

func doCustomTelnet() (conn *telnet.Telnet, send chan string) {
	send = make(chan string)
	var outbuff []byte

	var telnetReady sync.WaitGroup
	telnetReady.Add(1)

	_conn, err := net.Dial("tcp", ServerAddr)
	if err != nil {
		log.Fatalln("Failed to dial server:", err)
	}

	conn = telnet.NewTelnet(_conn)

	conn.Listen(func(code telnet.TelnetCode, bytes []byte) {
		if code == telnet.GMCP {
			rex := regexp.MustCompile(`^((?:[a-zA-Z]+\.?)+) (.+)$`)
			matches := rex.FindStringSubmatch(string(bytes))
			var gmcp messageGMCP
			gmcp.Type = "GMCP"

			if(len(matches) > 1) {
				gmcp.Method = matches[1]
				json.Unmarshal([]byte(matches[2]), &gmcp.Data)
				if gmcp.Method == "IRE.FileStore.Content" {
					handleFilestoreData(gmcp.Data)
				}
				toAstiWindow <- bootstrap.MessageOut{
					Name:    "GMCP." + matches[1],
					Payload: matches[2],
				}
			} else {
				log.Println("WTF? Bad GMCP:", matches)
			}
		}
	})
	conn.HandleIAC(func(inBytes []byte) {
		log.Println("IAC:", telnet.ToString(inBytes))
		switch telnet.ToString(inBytes) {
		case telnet.ToString(telnet.BuildCommand(telnet.GA)):
			//_, err = os.Stdout.Write(outbuff)
			if err != nil {
				fmt.Println("stdout write error:", err)
			}

			ansiToHtml(outbuff)

			outBytes := bytes.ReplaceAll(outbuff, []byte("\r"), []byte(``))
			send <- string(outBytes)

			outbuff = []byte{}
		case telnet.ToString(telnet.BuildCommand(telnet.WILL, telnet.GMCP)):
			conn.SendCommand(telnet.DO, telnet.GMCP)
			conn.SendGMCP(`Core.Hello { "client": "Deathwish", "version": "0.0.1" }`)
			conn.SendGMCP(`Core.Supports.Set ["Core.Login", "Char 1", "Char.Skills 1", "Char.Items 1", "Comm.Channel 1", "IRE.Rift 1", "IRE.FileStore 1", "Room 1", "IRE.Composer 1", "Redirect 1", "IRE.Display 3", "IRE.Tasks 1", "IRE.Sound 1", "IRE.Misc 1", "IRE.Time 1", "IRE.Target 1"]`)
			telnetReady.Done()
			go func() {
				select {
				case <-terminate:
				case <-time.After(time.Second * 30):
					conn.SendGMCP(`IRE.FileStore.Request {"request": "get html5-reflexes raw"}`)
				}
			}()
		}
	})

	go func() {
		for {
			var buffer [1]byte // Seems like the length of the buffer needs to be small, otherwise will have to wait for buffer to fill up.
			p := buffer[:]

			for {
				// Read 1 byte.
				n, err := conn.Read(p)
				if n <= 0 && nil == err {
					continue
				} else if n <= 0 && nil != err {
					break
				}
				outbuff = append(outbuff, p...)
			}
		}
	}()

	telnetReady.Wait()
	return
}

func doTelnetLogin(user string, pass string) {
	fmt.Println("doing login with", user, pass)
	conn, out := doCustomTelnet()
	fmt.Println("Done connection")
	go func() {
		for {
			select {
			case <-telnetClose:
				conn.Close()
				return
			case msg := <-out:
				handleInboundMessage(msg)
				break
			case msg := <-toTelnet:
				fmt.Println("to telnet:", msg+"\n")
				conn.Write([]byte(msg + "\n"))
				break
			}
		}
	}()

	GMCPLstring := fmt.Sprintf(`Char.Login { "name": "%s", "password": "%s" }`, user, pass)
	fmt.Println("sending:", GMCPLstring)
	conn.SendGMCP(GMCPLstring)

	return
}

func handleFilestoreData(raw interface{}) {
	fmt.Println("have filestore data")
	mapData := raw.(map[string]interface{})
	rawZippedContent := mapData["text"].(string)
	if len(rawZippedContent) <= 16 {
		return
	}
	ioutil.WriteFile("filestore.txt", []byte(rawZippedContent), syscall.O_CREAT|syscall.O_TRUNC)
}
