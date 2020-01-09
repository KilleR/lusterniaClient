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
	variableRex      *regexp.Regexp
	messageListeners messageListener
)

func init() {
	variableRex = regexp.MustCompile(`@([^ ]+)`)
}

func processCommand(rawCommand string, commandVars map[string]string) (out []string) {
	commands := strings.Split(rawCommand, ";")

	for _, command := range commands {
		replaceVars(command, commandVars)
		out = append(out, command)
	}

	return out
}

func replaceVars(in string, tmpVars map[string]string) string {
	matches := variableRex.FindAllStringSubmatch(in, -1)

	fmt.Println("Doing replacement:", in, tmpVars)
	for _, match := range matches {
		var outVal string
		varName := match[1]
		commandVarVal, ok := tmpVars[varName]
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
		in = strings.Replace(in, match[0], outVal, -1)
	}
	return in
}

func doAliases(command string) (out string) {
	for _, alias := range aliases {
		tmpVars := alias.match(command)
		if tmpVars != nil {
			fmt.Println("action:", alias.Actions, tmpVars)

			if alias.PrefixSuffix {
				prefix, suffix := alias.split(command)
				tmpVars["prefix"] = prefix
				tmpVars["suffix"] = suffix

				fmt.Println(command, alias.rex, prefix, suffix)
			}

			doActions(alias.Actions, tmpVars)
			return
		}
	}
	fmt.Println("command to telnet:", command)
	toTelnet <- command
	return
}

func doActions(actions []reflexAction, tmpVars map[string]string) {
	for _, action := range actions {
		switch action.Action {
		case "command", "":
			for _, command := range processCommand(action.Command, tmpVars) {
				var fullCommand string
				prefix, ok := tmpVars["prefix"]
				if ok && prefix != "" {
					fullCommand += prefix + " "
				}
				fullCommand += command
				suffix, ok := tmpVars["suffix"]
				if ok && suffix != "" {
					fullCommand += " " + suffix
				}
				toTelnet <- fullCommand
			}
		case "wait":
			waitTime, err := time.ParseDuration(fmt.Sprintf("%ds%dms", action.Seconds, action.Milliseconds))
			if err != nil {
				astilog.Error(err)
				continue
			}
			time.Sleep(waitTime)
		case "notify":
			action.Notice = replaceVars(action.Notice, tmpVars)
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
				nexusVars[action.VarName] = varValue
			}
		}
	}
}

func handleInboundMessage(msg string) {

	if err := bootstrap.SendMessage(w, "telnet.content", msg); err != nil {
		astilog.Error(errors.Wrap(err, "sending telnet content failed"))
	}
}
