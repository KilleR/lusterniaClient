package main

import (
	"github.com/asticode/go-astilectron"
	"os"
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
	loginPass string
	//ServerAddr = "lus.ndguarino.com:9876"
	ServerAddr = "lusternia.com:23"
	AstiClient *astilectron.Astilectron
	AstiWindow *astilectron.Window
	terminate  chan bool
)

func init() {
	loginPass = os.Getenv("password")
	terminate = make(chan bool)
}

func main() {
	bootstrapAstilectron()

	return
}
