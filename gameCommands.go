package main

import (
	"regexp"
	"strings"
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
