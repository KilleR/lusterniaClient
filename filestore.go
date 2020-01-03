package main

import (
	"bytes"
	"compress/zlib"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"regexp"
	"strconv"
	"strings"
)

type reflexPackage struct {
	Type    string   `json:"type"`
	Name    string   `json:"name"`
	Enabled bool     `json:"enabled"`
	Id      int      `json:"id"`
	Items   []reflex `json:"items"`
}

type reflex struct {
	Type          string         `json:"type"`
	Name          string         `json:"name"`
	Enabled       bool           `json:"enabled"`
	Id            int            `json:"id"`
	Key           FlexInt        `json:"key"`
	KeyAlt        bool           `json:"key_alt"`
	KeyShift      bool           `json:"key_shift"`
	KeyCtrl       bool           `json:"key_ctrl"`
	Matching      string         `json:"matching"`
	WholeWords    bool           `json:"whole_words"`
	CaseSensitive bool           `json:"case_sensitive"`
	PrefixSuffix  bool           `json:"prefix_suffix"`
	Text          string         `json:"text"`
	Actions       []reflexAction `json:"actions"`
}

type reflexAction struct {
	Action   string `json:"action"`
	Notice   string `json:"notice"`
	NoticeFg string `json:"notice_fg"`
	NoticeBg string `json:"notice_bg"`
	Command  string `json:"command"`
}

// A FlexInt is an int that can be unmarshalled from a JSON field
// that has either a number or a string value.
// E.g. if the json field contains an string "42", the
// FlexInt value will be "42".
type FlexInt int

// UnmarshalJSON implements the json.Unmarshaler interface, which
// allows us to ingest values of any json type as an int and run our custom conversion

func (fi *FlexInt) UnmarshalJSON(b []byte) error {
	if b[0] != '"' {
		return json.Unmarshal(b, (*int)(fi))
	}
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	i, err := strconv.Atoi(s)
	if err != nil {
		return err
	}
	*fi = FlexInt(i)
	return nil
}

var (
	nexusVars     map[string]interface{}
	nexusReflexes reflexPackage
	nexusPackages []reflexPackage
	keybinds      []reflex
)

func init() {
	nexusVars = make(map[string]interface{})
}

func doFileStore(raw []byte) (err error) {
	fmt.Println("have filestore size", len(raw))
	decoded := make([]byte, base64.StdEncoding.DecodedLen(len(raw)))
	base64.StdEncoding.Decode(decoded, raw)
	zipReader, err := zlib.NewReader(bytes.NewReader(decoded[16:]))
	if err != nil {
		return err
	}
	unzipped, err := ioutil.ReadAll(zipReader)
	if err != nil {
		return
	}

	fmt.Println(string(unzipped))

	varsRex := regexp.MustCompile("client.vars = (.*)")
	varsMatches := varsRex.FindSubmatch(unzipped)
	varsObj := bytes.Trim(varsMatches[1], ";")
	err = json.Unmarshal(varsObj, &nexusVars)
	fmt.Println(string(varsObj))
	if err != nil {
		return
	}

	reflexesRex := regexp.MustCompile("client.reflexes = (.*)")
	reflexesMatches := reflexesRex.FindSubmatch(unzipped)
	reflexesObj := bytes.Trim(reflexesMatches[1], ";")
	err = json.Unmarshal(reflexesObj, &nexusReflexes)
	fmt.Println(string(reflexesObj))
	if err != nil {
		return
	}

	packagesRex := regexp.MustCompile("client.packages = (.*)")
	packagesMatches := packagesRex.FindSubmatch(unzipped)
	packagesObj := bytes.Trim(packagesMatches[1], ";")
	err = json.Unmarshal(packagesObj, &nexusPackages)
	fmt.Println(string(packagesObj))
	if err != nil {
		return
	}

	nexusPackages = append(nexusPackages, nexusReflexes)

	workingReflexes := 0
	totalReflexes := 0
	for _, pkg := range nexusPackages {
	reflexLoop:
		for _, reflex := range pkg.Items {
			totalReflexes++

			switch reflex.Type {
			case "keybind":

				for _, action := range reflex.Actions {
					switch action.Action {
					case "command":
						//fmt.Println("command", action.Action)
						break
					case "wait":
						break
					default:
						//fmt.Println("["+pkg.Name+"] Cannot handle reflex:", reflex.Type, reflex.Name, "contains action:", action.Action)
						continue reflexLoop
					}
				}
				workingReflexes++
				fmt.Println("Working reflex:", reflex.Id, reflex.Name, reflex.Key, reflex.Actions)
				keybinds = append(keybinds, reflex)
				break
			case "alias":
				if strings.ContainsAny(reflex.Text, "<>") {
					break
				}
				for _, action := range reflex.Actions {
					switch action.Action {
					case "command":
						//fmt.Println("command", action.Action)
						break
					case "wait":
						break
					default:
						//fmt.Println("["+pkg.Name+"] Cannot handle reflex:", reflex.Type, reflex.Name, "contains action:", action.Action)
						continue reflexLoop
					}
				}
				workingReflexes++
				fmt.Println("Working reflex:", reflex.Id, reflex.Name, reflex.Key, reflex.Actions)
				break
			default:
				//fmt.Println("Cannot handle reflex of type:", reflex.Type)
				continue
			}
		}
	}

	fmt.Println("working reflexes:", workingReflexes, "of", totalReflexes)

	jsonKeybinds, _ := json.MarshalIndent(keybinds, "", "  ")
	fmt.Println(string(jsonKeybinds))

	return
}
