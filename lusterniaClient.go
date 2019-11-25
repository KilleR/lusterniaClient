package main

import (
	"bufio"
	"fmt"
	"log"
	"lusterniaClient/discord"
	"lusterniaClient/telnet"
	"net"
	"os"
)

var (
	loginPass  string
	ServerAddr = "lus.ndguarino.com:9876"
	conns      map[string]*telnet.Telnet
)

func init() {
	loginPass = os.Getenv("password")
	conns = make(map[string]*telnet.Telnet)
}

func doCustomTelnet(client string, send chan discord.DiscordMessage) (conn *telnet.Telnet) {
	var outbuff []byte

	_conn, err := net.Dial("tcp", ServerAddr)
	if err != nil {
		log.Fatalln("Failed to dial server:", err)
	}
	conn = telnet.NewTelnet(_conn)
	conn.Listen(func(code telnet.TelnetCode, bytes []byte) {
		log.Println(code, string(bytes))
	})
	conn.HandleIAC(func(bytes []byte) {
		log.Println("IAC:", telnet.ToString(bytes))
		if telnet.ToString(bytes) == telnet.ToString(telnet.BuildCommand(telnet.GA)) {
			log.Println("GO AHEAD")

			_, err = os.Stdout.Write(outbuff)
			if err != nil {
				fmt.Println("stdout write error:", err)
			}
			send <- discord.DiscordMessage{
				ClientID: client,
				Content:  string(outbuff),
			}

			outbuff = []byte{}
		}
		if telnet.ToString(bytes) == telnet.ToString(telnet.BuildCommand(telnet.WILL, telnet.GMCP)) {
			conn.SendCommand(telnet.DO, telnet.GMCP)
			conn.SendGMCP(`Core.Hello { "client": "Deathwish", "version": "0.0.1" }`)
			conn.SendGMCP(`Core.Supports.Set ["Char 1", "Char.Skills 1", "Char.Items 1", "Comm.Channel 1", "IRE.Rift 1", "IRE.FileStore 1", "Room 1", "IRE.Composer 1", "Redirect 1", "IRE.Display 3", "IRE.Tasks 1", "IRE.Sound 1", "IRE.Misc 1", "IRE.Time 1", "IRE.Target 1"]`)
			log.Println(loginPass)
			conn.SendGMCP(`Char.Login { "name": "Geran", "password": "` + loginPass + `" }`)
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
				//_, err = os.Stdout.Write(p)
				//if err != nil {
				//	fmt.Println("stdout write error:", err)
				//}
			}
		}
	}()

	reader := bufio.NewReader(os.Stdin)
	for {
		text, _ := reader.ReadString('\n')
		_, err = conn.Write([]byte(text))
		if err != nil {
			fmt.Println("conn write error:", err)
		}
	}
}

func main() {
	//doCustomTelnet()
	var d discord.Discord
	d.Connect()
	go func() {
		for {
			msg := <-d.Recv
			fmt.Println(msg)
			conn, ok := conns[msg.ClientID]
			if !ok {
				conn = doCustomTelnet(msg.ClientID, d.Send)
				conns[msg.ClientID] = conn
			}
			conn.Write([]byte(msg.Content))
		}
	}()

	reader := bufio.NewReader(os.Stdin)
	for {
		text, _ := reader.ReadString('\n')
		fmt.Println("ECHO:", text)

	}
}
