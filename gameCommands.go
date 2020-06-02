package main

import (
	"fmt"
	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"github.com/pkg/errors"
	"log"
	"regexp"
	"strings"
	"time"
)

type commandLine struct {
	string
	gag bool
}

var (
	variableRex      *regexp.Regexp
	messageListeners messageListenerStore
)

func init() {
	variableRex = regexp.MustCompile(`@([^ ]+)`)
	messageListeners = newMessageListenerStore()
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

func (line *commandLine) doAliases() (out string) {
	for _, alias := range aliases {
		if !alias.Enabled {
			continue
		}
		tmpVars := alias.match(line.string)
		if tmpVars != nil {
			fmt.Println("action:", alias.Actions, tmpVars)

			if alias.PrefixSuffix {
				prefix, suffix := alias.split(line.string)
				tmpVars["prefix"] = prefix
				tmpVars["suffix"] = suffix
			}

			line.doActions(alias, tmpVars)
			return
		}
	}
	fmt.Println("command to telnet:", line)
	if !line.gag {
		toTelnet <- line.string
	}
	return
}

func (line *commandLine) doActions(processor reflexProcessor, tmpVars map[string]string) {
	for _, action := range processor.Actions {
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
				log.Println(err)
				continue
			}
			time.Sleep(waitTime)
		case "notify":
			action.Notice = replaceVars(action.Notice, tmpVars)
			toAstiWindow <- bootstrap.MessageOut{
				Name:    "notify",
				Payload: action,
			}
		case "highlight":
			var highlight string
			highlight += fmt.Sprintf(`<span style="background-color:%s; color: %s">%s</span>`, action.HighlightBg, action.HighlightFg, processor.find(line.string))
			line.string = processor.replace(line.string, highlight)
			line.string = replaceVars(line.string, tmpVars)
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
		case "gag":
			line.gag = true
		case "waitfor":
			// TODO : properly handle waitfor
			return
		case "disableme":
			processor.Enabled = false
		case "enable":
			enableReflex(action.Type, action.Name)
		case "stop":
			return

		}
	}
}

func handleInboundMessage(rawMsg string) {
	msgs := strings.Split(rawMsg, "\n")

	for _, msg := range msgs {
		msg = strings.ReplaceAll(msg, "\n", "")
		//if len(msg) == 0 {
		//	continue
		//}
		var line commandLine
		line.string = msg

		for _, t := range triggers {
			tmpVars := t.match(msg)
			if tmpVars != nil {
				fmt.Println("Have match for trigger:", t.Guid, tmpVars)
				line.doActions(t, tmpVars)
			}
		}

		if err := bootstrap.SendMessage(w, "telnet.content", line.string); err != nil {
			log.Println(errors.Wrap(err, "sending telnet content failed"))
		}
	}
}
