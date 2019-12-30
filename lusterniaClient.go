package main

import (
	"github.com/asticode/go-astilectron"
	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"io/ioutil"
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
)

func init() {
	loginPass = os.Getenv("password")
	terminate = make(chan bool)
	telnetClose = make(chan bool)
	toAstiWindow = make(chan bootstrap.MessageOut)
	toTelnet = make(chan string)
}

func main() {

	raw, _ := ioutil.ReadFile("filestore.txt")
	log.Println(doFileStore(raw))
	return
	bootstrapAstilectron()

	telnetClose <- true

	<-time.After(time.Second)
}
