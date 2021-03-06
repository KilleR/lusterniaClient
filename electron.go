package main

import (
	"encoding/json"
	"flag"
	"github.com/asticode/go-astikit"
	"github.com/asticode/go-astilectron"
	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"github.com/pkg/errors"
	"log"
)

// Constants
const htmlAbout = `Welcome on <b>Astilectron</b> demo!<br>
This is using the bootstrap and the bundler.`

// Vars injected via ldflags by bundler
var (
	AppName            string
	BuiltAt            string
	VersionAstilectron string
	VersionElectron    string
)

// Application Vars
var (
	debug = flag.Bool("d", true, "enables the debug mode")
	w     *astilectron.Window
)

func bootstrapAstilectron() {
	// Init
	flag.Parse()

	// Create logger
	logger := log.New(log.Writer(), log.Prefix(), log.Flags())

	// Run bootstrap
	if err := bootstrap.Run(bootstrap.Options{
		Asset:    Asset,
		AssetDir: AssetDir,
		AstilectronOptions: astilectron.Options{
			AppName:            AppName,
			AppIconDarwinPath:  "resources/icon.icns",
			AppIconDefaultPath: "resources/icon.png",
			SingleInstance:     true,
			VersionAstilectron: VersionAstilectron,
			VersionElectron:    VersionElectron,
		},
		Debug:  *debug,
		Logger: logger,
		MenuOptions: []*astilectron.MenuItemOptions{{
			Label: astikit.StrPtr("File"),
			SubMenu: []*astilectron.MenuItemOptions{
				{
					Label: astikit.StrPtr("About"),
					OnClick: func(e astilectron.Event) (deleteListener bool) {
						if err := bootstrap.SendMessage(w, "about", htmlAbout, func(m *bootstrap.MessageIn) {
							// Unmarshal payload
							var s string
							if err := json.Unmarshal(m.Payload, &s); err != nil {
								logger.Println(errors.Wrap(err, "unmarshaling payload failed"))
								return
							}
							logger.Println("About modal has been displayed and payload is %s!", s)
						}); err != nil {
							logger.Println(errors.Wrap(err, "sending about event failed"))
						}
						return
					},
				},
				{Role: astilectron.MenuItemRoleClose},
			},
		}},
		OnWait: func(astiMain *astilectron.Astilectron, ws []*astilectron.Window, _ *astilectron.Menu, _ *astilectron.Tray, _ *astilectron.Menu) error {
			w = ws[0]

			//go func() {
			//	telnetOut := make(chan string)
			//	conn := doCustomTelnet(telnetOut)
			//	for {
			//		select {
			//		case <-telnetClose:
			//			conn.Close()
			//			return
			//		case msg := <-telnetOut:
			//			handleInboundMessage(msg)
			//			break
			//		case msg := <-toTelnet:
			//			fmt.Println("to telnet:", msg+"\n")
			//			conn.Write([]byte(msg + "\n"))
			//			break
			//		}
			//	}
			//}()

			go func() {
				for {
					msg := <-toAstiWindow
					if err := bootstrap.SendMessage(w, msg.Name, msg.Payload); err != nil {
						logger.Println(errors.Wrap(err, "sending abstract message failed"))
					}
				}
			}()
			return nil
		},
		RestoreAssets: RestoreAssets,
		Windows: []*bootstrap.Window{{
			Homepage:       "index.html",
			MessageHandler: handleMessages,
			Options: &astilectron.WindowOptions{
				BackgroundColor: astikit.StrPtr("#333"),
				Center:          astikit.BoolPtr(true),
				Height:          astikit.IntPtr(900),
				Width:           astikit.IntPtr(1200),
			},
		}},
	}); err != nil {
		logger.Fatalln(errors.Wrap(err, "running bootstrap failed"))
	}
}
