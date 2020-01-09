package main

import (
	"github.com/asticode/go-astilectron"
	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"log"
	"os"
	"time"
)

type GMCPRequest struct {
	Method string      `json:"method"`
	Data   interface{} `json:"data"`
}

type messageGMCP struct {
	GMCPRequest
	Type string `json:"type"`
}

type messageMain struct {
	Type    string `json:"type"`
	Content string `json:"content"`
}

var (
	loginPass  string
	ServerAddr = "lus.ndguarino.com:9876"
	//ServerAddr = "lusternia.com:23"
	AstiClient   *astilectron.Astilectron
	AstiWindow   *astilectron.Window
	terminate    chan bool
	telnetClose  chan bool
	toTelnet     chan string
	toAstiWindow chan bootstrap.MessageOut

	listenerStore messageListenerStore
)

func init() {
	loginPass = os.Getenv("password")
	terminate = make(chan bool)
	telnetClose = make(chan bool)
	toAstiWindow = make(chan bootstrap.MessageOut)
	toTelnet = make(chan string)
	listenerStore = newMessageListenerStore()
}

func main() {

	go func() {
		<-time.After(time.Second * 5)
		//raw, _ := ioutil.ReadFile("filestore.txt")
		log.Println(doFileStore([]byte(filestore)))
	}()

	//<-time.After(time.Second*6)
	//doAliases("abpaslaran")
	//return
	bootstrapAstilectron()

	telnetClose <- true

	<-time.After(time.Second)
}
