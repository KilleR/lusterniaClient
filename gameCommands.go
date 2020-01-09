package main

import (
	"fmt"
	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"github.com/asticode/go-astilog"
	"github.com/pkg/errors"
	"regexp"
	"strings"
	"time"
)

var (
	variableRex *regexp.Regexp
)

func init() {
	variableRex = regexp.MustCompile(`@([^ ]+)`)
}

func processCommand(rawCommand string, commandVars map[string]string) (out []string) {
	commands := strings.Split(rawCommand, ";")

	for _, command := range commands {
		matches := variableRex.FindAllStringSubmatch(command, -1)

		for _, match := range matches {
			var outVal string
			varName := match[1]
			commandVarVal, ok := commandVars[varName]
			if !ok {
				varVal, ok := nexusVars[varName]
				if !ok {
					outVal = ""
				} else {
					outVal, ok = varVal.(string)
					if !ok {
						outVal = ""
					}
				}
			} else {
				outVal = commandVarVal
			}
			command = strings.Replace(command, match[0], outVal, -1)
		}
		out = append(out, command)
	}

	return out
}

func doAliases(command string) (out string) {
	for _, alias := range aliases {
		tmpVars := make(map[string]string)
		matches := alias.rex.FindStringSubmatch(command)
		if len(matches) > 0 {
			fmt.Println("Running alias:", alias.Guid, alias.Text, alias.Actions)
			for i, match := range matches[1:] {
				fmt.Println("Matching:", i, match)
				fmt.Println("Against:", alias.varKeys)
				varKey := alias.varKeys[i]
				tmpVars[varKey] = match
			}

			doActions(alias.Actions, tmpVars)
			return
		}
	}
	toTelnet <- command
	return
}

func doActions(actions []reflexAction, tmpVars map[string]string) {
	for _, action := range actions {
		switch action.Action {
		case "command", "":
			for _, command := range processCommand(action.Command, tmpVars) {
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
		case "variable":
			var varValue string

			switch action.ValType {
			case "value":
				varValue = action.Value
			case "variable":
				var ok bool
				varValue, ok = tmpVars[action.Value]
				if !ok {
					varValue, ok = nexusVars[action.Value].(string)
					if !ok {
						varValue = ""
					}
				}
			default:
				fmt.Println("Unknown value type:", action.ValType)
			}

			switch action.Op {
			case "set":
				fmt.Println("Setting", action.VarName, "to", varValue)
				nexusVars[action.VarName] = action.Value
			}
		}
	}
}

func handleInboundMessage(msg string) {

	if err := bootstrap.SendMessage(w, "telnet.content", msg); err != nil {
		astilog.Error(errors.Wrap(err, "sending telnet content failed"))
	}
}
