package main

import (
	"fmt"
	"github.com/asticode/go-astilectron"
	"github.com/asticode/go-astilog"
	astiptr "github.com/asticode/go-astitools/ptr"
	"github.com/pkg/errors"
)

func bootstrapAstilectron() {
	telnetOut := make(chan string)
	conn := doCustomTelnet("me", telnetOut)

	a, _ := astilectron.New(astilectron.Options{
		AppName: "Deathwish MUD",
	})
	defer a.Close()

	a.HandleSignals()

	err := a.Start()
	if err != nil {
		astilog.Fatal(errors.Wrap(err, "main: new window failed"))
	}

	// New window
	var w *astilectron.Window
	if w, err = a.NewWindow("example/index.html", &astilectron.WindowOptions{
		Center:         astiptr.Bool(true),
		Fullscreenable: astiptr.Bool(true),
		Height:         astiptr.Int(900),
		Width:          astiptr.Int(1200),
	}); err != nil {
		astilog.Fatal(errors.Wrap(err, "main: new window failed"))
	}

	// Create windows
	if err = w.Create(); err != nil {
		astilog.Fatal(errors.Wrap(err, "main: creating window failed"))
	}

	w.OpenDevTools()

	go func() {
		for {
			msg := <-telnetOut
			w.SendMessage(msg, func(m *astilectron.EventMessage) {
				var s string
				m.Unmarshal(&s)

				fmt.Println(s)
			})
		}
	}()

	w.OnMessage(func(m *astilectron.EventMessage) (v interface{}) {
		var s string
		m.Unmarshal(&s)

		fmt.Println("message from client:", s)
		conn.Write([]byte(s + "\n"))
		return nil
	})

	a.Wait()
}
