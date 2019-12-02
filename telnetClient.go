package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"lusterniaClient/telnet"
	"net"
	"os"
	"regexp"
	"time"
)

var ansiRex *regexp.Regexp

func init() {
	ansiRex = regexp.MustCompile("\u001B\\[0m")
}

func ansiToHtml(raw []byte) []byte {
	bytes.Contains(raw, []byte(`\u001b\[0m`))

	res := ansiRex.FindAll(raw, -1)
	for _, v := range res {
		log.Println("found ANSI reset:", string(v))
	}
	return raw
}

func doCustomTelnet(client string, send chan string) (conn *telnet.Telnet) {
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
			var gmcp GMCPRequest
			gmcp.Method = matches[1]
			json.Unmarshal([]byte(matches[2]), &gmcp.Data)
			JSON, _ := json.MarshalIndent(gmcp, "", "  ")
			log.Println(string(JSON))
		}
	})
	conn.HandleIAC(func(bytes []byte) {
		log.Println("IAC:", telnet.ToString(bytes))
		switch telnet.ToString(bytes) {
		case telnet.ToString(telnet.BuildCommand(telnet.GA)):
			_, err = os.Stdout.Write(outbuff)
			if err != nil {
				fmt.Println("stdout write error:", err)
			}

			ansiToHtml(outbuff)

			send <- string(outbuff)
			//send <- stripansi.Strip(string(outbuff))

			outbuff = []byte{}
			break
		case telnet.ToString(telnet.BuildCommand(telnet.WILL, telnet.GMCP)):
			conn.SendCommand(telnet.DO, telnet.GMCP)
			conn.SendGMCP(`Core.Hello { "client": "Deathwish", "version": "0.0.1" }`)
			conn.SendGMCP(`Core.Supports.Set ["Char 1", "Char.Skills 1", "Char.Items 1", "Comm.Channel 1", "IRE.Rift 1", "IRE.FileStore 1", "Room 1", "IRE.Composer 1", "Redirect 1", "IRE.Display 3", "IRE.Tasks 1", "IRE.Sound 1", "IRE.Misc 1", "IRE.Time 1", "IRE.Target 1"]`)
			go func() {
				<-time.After(time.Second * 30)
				conn.SendGMCP(`IRE.FileStore.Request {"request": "list"}`)
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
