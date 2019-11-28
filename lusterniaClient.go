package main

import (
	"bufio"
	"fmt"
	"github.com/acarl005/stripansi"
	"github.com/asticode/go-astilectron"
	"github.com/asticode/go-astilog"
	astiptr "github.com/asticode/go-astitools/ptr"
	"github.com/pkg/errors"
	"log"
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

func doCustomTelnet(client string, send chan string) (conn *telnet.Telnet) {
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
			_, err = os.Stdout.Write(outbuff)
			if err != nil {
				fmt.Println("stdout write error:", err)
			}
			send <- stripansi.Strip(string(outbuff))

			outbuff = []byte{}
		}
		if telnet.ToString(bytes) == telnet.ToString(telnet.BuildCommand(telnet.WILL, telnet.GMCP)) {
			conn.SendCommand(telnet.DO, telnet.GMCP)
			conn.SendGMCP(`Core.Hello { "client": "Deathwish", "version": "0.0.1" }`)
			conn.SendGMCP(`Core.Supports.Set ["Char 1", "Char.Skills 1", "Char.Items 1", "Comm.Channel 1", "IRE.Rift 1", "IRE.FileStore 1", "Room 1", "IRE.Composer 1", "Redirect 1", "IRE.Display 3", "IRE.Tasks 1", "IRE.Sound 1", "IRE.Misc 1", "IRE.Time 1", "IRE.Target 1"]`)
			//conn.SendGMCP(`Char.Login { "name": "Geran", "password": "` + loginPass + `" }`)}`)
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

	return

	//reader := bufio.NewReader(os.Stdin)
	//for {
	//	text, _ := reader.ReadString('\n')
	//	_, err = conn.Write([]byte(text))
	//	if err != nil {
	//		fmt.Println("conn write error:", err)
	//	}
	//}
}

func bootstrapAstilectron() {
	telnetOut := make(chan string)
	doCustomTelnet("me", telnetOut)

	a, _ := astilectron.New(astilectron.Options{
		AppName: "Deathwish MUD",
	})
	defer a.Close()

	a.HandleSignals()

	err := a.Start()
	if err != nil {
		astilog.Fatal(errors.Wrap(err, "main: new window failed"))
	}

	// New window
	var w *astilectron.Window
	if w, err = a.NewWindow("example/index.html", &astilectron.WindowOptions{
		Center:         astiptr.Bool(true),
		Fullscreenable: astiptr.Bool(true),
		Height:         astiptr.Int(900),
		Width:          astiptr.Int(1200),
	}); err != nil {
		astilog.Fatal(errors.Wrap(err, "main: new window failed"))
	}

	// Create windows
	if err = w.Create(); err != nil {
		astilog.Fatal(errors.Wrap(err, "main: creating window failed"))
	}

	w.OpenDevTools()

	w.OnLogin(func(i astilectron.Event) (username, password string, err error) {
		fmt.Println("login:", i)
		return "fred", "bob", nil
	})

	w.SendMessage("ho ho ho", func(m *astilectron.EventMessage) {
		var s string
		m.Unmarshal(&s)

		fmt.Println(s)
	})

	go func() {
		for {
			msg := <-telnetOut
			w.SendMessage(msg, func(m *astilectron.EventMessage) {
				var s string
				m.Unmarshal(&s)

				fmt.Println(s)
			})
		}
	}()

	// Create the notification
	var n = a.NewNotification(&astilectron.NotificationOptions{
		Body:             "My Body",
		HasReply:         astilectron.PtrBool(true), // Only MacOSX
		Icon:             "/path/to/icon",
		ReplyPlaceholder: "type your reply here", // Only MacOSX
		Title:            "My title",
	})

	// Add listeners
	n.On(astilectron.EventNameNotificationEventClicked, func(e astilectron.Event) (deleteListener bool) {
		fmt.Println("the notification has been clicked!")
		return
	})
	// Only for MacOSX
	n.On(astilectron.EventNameNotificationEventReplied, func(e astilectron.Event) (deleteListener bool) {
		fmt.Println("the user has replied to the notification: %s", e.Reply)
		return
	})

	// Create notification
	n.Create()

	// Show notification
	n.Show()

	a.Wait()
}

func main() {
	bootstrapAstilectron()

	return

	reader := bufio.NewReader(os.Stdin)
	for {
		text, _ := reader.ReadString('\n')
		fmt.Println("ECHO:", text)
	}
}
