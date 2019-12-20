package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"log"
	"lusterniaClient/telnet"
	"net"
	"os"
	"regexp"
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

func doCustomTelnet(send chan string) (conn *telnet.Telnet) {
	var outbuff []byte

	_conn, err := net.Dial("tcp", ServerAddr)
	if err != nil {
		log.Fatalln("Failed to dial server:", err)
	}

	conn = telnet.NewTelnet(_conn)

	conn.Listen(func(code telnet.TelnetCode, bytes []byte) {
		log.Println("code:", telnet.CodeToString(code), string(bytes))
		if code == telnet.GMCP {
			rex := regexp.MustCompile(`^((?:[a-zA-Z]+\.?)+) (.+)$`)
			matches := rex.FindStringSubmatch(string(bytes))
			var gmcp messageGMCP
			gmcp.Type = "GMCP"
			gmcp.Method = matches[1]
			json.Unmarshal([]byte(matches[2]), &gmcp.Data)
			JSON, _ := json.MarshalIndent(gmcp, "", "  ")
			log.Println(string(JSON))
			toAstiWindow <- bootstrap.MessageOut{
				Name:    "GMCP." + matches[1],
				Payload: matches[2],
			}
			//AstiWindow.SendMessage(string(JSON))
		}
	})
	conn.HandleIAC(func(inBytes []byte) {
		log.Println("IAC:", telnet.ToString(inBytes))
		switch telnet.ToString(inBytes) {
		case telnet.ToString(telnet.BuildCommand(telnet.GA)):
			_, err = os.Stdout.Write(outbuff)
			if err != nil {
				fmt.Println("stdout write error:", err)
			}

			ansiToHtml(outbuff)

			outBytes := bytes.ReplaceAll(outbuff, []byte("\r"), []byte(``))
			send <- string(outBytes)

			outbuff = []byte{}
			break
		case telnet.ToString(telnet.BuildCommand(telnet.WILL, telnet.GMCP)):
			conn.SendCommand(telnet.DO, telnet.GMCP)
			conn.SendGMCP(`Core.Hello { "client": "Deathwish", "version": "0.0.1" }`)
			conn.SendGMCP(`Core.Supports.Set ["Char 1", "Char.Skills 1", "Char.Items 1", "Comm.Channel 1", "IRE.Rift 1", "IRE.FileStore 1", "Room 1", "IRE.Composer 1", "Redirect 1", "IRE.Display 3", "IRE.Tasks 1", "IRE.Sound 1", "IRE.Misc 1", "IRE.Time 1", "IRE.Target 1"]`)
			go func() {
				select {
				case <-terminate:
					break
				case <-time.After(time.Second * 30):
					conn.SendGMCP(`IRE.FileStore.Request {"request": "get html5-reflexes raw"}`)
				}
			}()
			break

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

	return
}
