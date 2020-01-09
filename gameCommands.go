package main

import (
	"fmt"
	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"github.com/asticode/go-astilog"
	"regexp"
	"strings"
	"time"
)

func processCommand(rawCommand string) (out []string) {
	commands := strings.Split(rawCommand, ";")

	for _, command := range commands {
		variableRex := regexp.MustCompile(`@([^ ]+)`)
		matches := variableRex.FindAllStringSubmatch(command, -1)

		for _, match := range matches {
			var outVal string
			varName := match[1]
			varVal, ok := nexusVars[varName]
			if !ok {
				outVal = ""
			} else {
				outVal, ok = varVal.(string)
				if !ok {
					outVal = ""
				}
			}
			command = strings.Replace(command, match[0], outVal, -1)
		}
		out = append(out, command)
	}

	return out
}

func doActions(actions []reflexAction) {
	for _, action := range actions {
		switch action.Action {
		case "command", "":
			for _, command := range processCommand(action.Command) {
				toTelnet <- command
			}
		case "wait":
			waitTime, err := time.ParseDuration(fmt.Sprintf("%ds%dms", action.Seconds, action.Milliseconds))
			if err != nil {
				astilog.Error(err)
				continue
			}
			time.Sleep(waitTime)
		case "notify":
			toAstiWindow <- bootstrap.MessageOut{
				Name:    "notify",
				Payload: action,
			}
		}
	}
}
