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
	case "command":
		var commandString commandLine
		if len(m.Payload) > 0 {
			// Unmarshal payload
			if err = json.Unmarshal(m.Payload, &commandString.string); err != nil {
				payload = err.Error()
				return
			}
			commandString.doAliases()
		}
	case "keybind":
		var line commandLine
		if len(m.Payload) > 0 {
			// Unmarshal payload
			if err = json.Unmarshal(m.Payload, &line.string); err != nil {
				payload = err.Error()
				return
			}
			fmt.Println("Received keybind:", line)
			for _, keybind := range keybinds {
				if keybind.Guid == line.string {
					line.doActions(keybind, nil)
				}
			}
		}
	}
	return
}
