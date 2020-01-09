package main

import (
	"encoding/json"
	"fmt"
	"github.com/asticode/go-astilectron"
	bootstrap "github.com/asticode/go-astilectron-bootstrap"
)

// handleMessages handles messages
func handleMessages(_ *astilectron.Window, m bootstrap.MessageIn) (payload interface{}, err error) {
	switch m.Name {
	case "explore":
		// Unmarshal payload
		var path string
		if len(m.Payload) > 0 {
			// Unmarshal payload
			if err = json.Unmarshal(m.Payload, &path); err != nil {
				payload = err.Error()
				return
			}
		}

		// Explore
		if payload, err = explore(path); err != nil {
			payload = err.Error()
			return
		}
	case "command":
		var commandString string
		if len(m.Payload) > 0 {
			// Unmarshal payload
			if err = json.Unmarshal(m.Payload, &commandString); err != nil {
				payload = err.Error()
				return
			}
			toTelnet <- commandString
		}
	case "keybind":
		var commandString string
		if len(m.Payload) > 0 {
			// Unmarshal payload
			if err = json.Unmarshal(m.Payload, &commandString); err != nil {
				payload = err.Error()
				return
			}
			fmt.Println("Recieved keybind:", commandString)
			for _, keybind := range keybinds {
				if keybind.Guid == commandString {
					for _, action := range keybind.Actions {
						switch action.Action {
						case "command", "":
							for _, command := range processCommand(action.Command) {
								toTelnet <- command
							}
						}
					}
				}
			}
		}
	}
	return
}

// Exploration represents the results of an exploration
type Exploration struct {
	Dirs       []Dir  `json:"dirs"`
	Files      string `json:"files,omitempty"`
	FilesCount int    `json:"files_count"`
	FilesSize  string `json:"files_size"`
	Path       string `json:"path"`
}

// PayloadDir represents a dir payload
type Dir struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// explore explores a path.
// If path is empty, it explores the user's home directory
func explore(path string) (s string, err error) {
	s = path
	return
}
