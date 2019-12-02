package main

import (
	"os"
)

type GMCPRequest struct {
	Method string
	Data   interface{}
}

var (
	loginPass  string
	ServerAddr = "lus.ndguarino.com:9876"
)

func init() {
	loginPass = os.Getenv("password")
}

func main() {
	bootstrapAstilectron()

	return
}
