package main

import (
	"github.com/asticode/go-astilectron"
	"os"
)

type GMCPRequest struct {
	Method string
	Data   interface{}
}

var (
	loginPass  string
	ServerAddr = "lus.ndguarino.com:9876"
	AstiClient *astilectron.Astilectron
)

func init() {
	loginPass = os.Getenv("password")
}

func main() {
	bootstrapAstilectron()

	return
}
