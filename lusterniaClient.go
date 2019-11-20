package main

import (
	"bufio"
	"fmt"
	"github.com/reiver/go-oi"
	telnet2 "github.com/reiver/go-telnet"
	"log"
	"lusterniaClient/telnet"
	"net"
	"os"
	"time"
)

var (
	ServerAddr = "lus.ndguarino.com:9876"
)

type caller struct{}

func (c caller) CallTELNET(ctx telnet2.Context, w telnet2.Writer, r telnet2.Reader) {

	go func() {

	}()
}

func initTelnet() {
	//var caller caller

	conn, err := telnet2.DialTo(ServerAddr)
	if err != nil {
		log.Fatalln("error connecting: ", err)
	}

	go func() {
		time.Sleep(time.Second)

		conn.Write([]byte("Geran\r\n"))
		conn.Write([]byte("s0meth1ng\r\n"))
	}()

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
				oi.LongWrite(os.Stdout, p)
			}
		}
	}()

	reader:= bufio.NewReader(os.Stdin)
	for {
		text, _ := reader.ReadString('\n')
		conn.Write([]byte(text))
	}
}

func doCustomTelnet() {
	_conn, err := net.Dial("tcp", ServerAddr)
	if err != nil {
		log.Fatalln("Failed to dial server:", err)
	}
	conn := telnet.NewTelnet(_conn)

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
				_, err = os.Stdout.Write(p)
				if err != nil {
					fmt.Println("stdout write error:", err)
				}

				if p[0] > 200 {
					log.Println("command::", p)
				}
			}
		}
	}()

	reader:= bufio.NewReader(os.Stdin)
	for {
		text, _ := reader.ReadString('\n')
		_,err = conn.Write([]byte(text))
		if err != nil {
			fmt.Println("conn write error:", err)
		}
	}
}

func main() {
	doCustomTelnet()
}