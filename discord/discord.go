package discord

import (
	"fmt"
	"github.com/bwmarrin/discordgo"
	"log"
	"os"
)

type DiscordMessage struct {
	ClientID string // this will use the channelID for the connected player to identify them to the game
	Content  string
}

type Discord struct {
	Session *discordgo.Session
	BotId   string
	Recv    chan DiscordMessage
	Send    chan DiscordMessage
}

func (d *Discord) Connect() {
	d.Recv = make(chan DiscordMessage)
	d.Send = make(chan DiscordMessage)

	botKey := os.Getenv("DISCORD_BOT_GO")
	discord, err := discordgo.New("Bot " + botKey)
	if err != nil {
		log.Fatalln("Failed to start Discord BOT:", err)
	}

	err = discord.Open()
	if err != nil {
		log.Fatalln("Failed to open Discord:", err)
	}

	usr, err := discord.User("@me")
	if err != nil {
		log.Fatalln("Failed to get bot ID:", err)
	}
	d.BotId = usr.ID

	discord.AddHandler(d.messageCreate)

	fmt.Println("Discord bot is now running.")

	d.Session = discord

	// begin listening for messages to send
	go func() {
		for {
			msg := <-d.Send
			fmt.Printf("Message send (ch: %s): %s\n", msg.ClientID, msg.Content)
			_, err := d.Session.ChannelMessageSend(msg.ClientID, msg.Content)
			if err != nil {
				log.Println("Error sending message to Discord:", err)
			}
		}
	}()
}

func (d *Discord) Close() {
	d.Session.Close()
}

func (d *Discord) messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	channel, err := s.Channel(m.ChannelID)
	if err != nil {
		log.Println("Failed to get message channel ID:", err)
		return
	}
	fmt.Printf("Message received from %s (channel: %s %v %s): %s\n", m.Author.Username, channel.Name, channel.Type, m.ChannelID, m.Content)
	// Ignore all messages created by the bot itself
	// This isn't required in this specific example but it's a good practice.
	if m.Author.ID == s.State.User.ID {
		return
	}

contentSwitch:
	switch m.Content {
	case "ping", "Ping":
		// If the message is "ping" reply with "Pong!"
		s.ChannelMessageSend(m.ChannelID, "Pong!")
		return
	case "pong", "Pong":
		// If the message is "pong" reply with "Ping!"
		s.ChannelMessageSend(m.ChannelID, "Ping!")
		return
	default:
		// look for mentions
		isMentioned := false
		for _, v := range m.Mentions {
			if v.ID == s.State.User.ID {
				isMentioned = true
			}
		}
		if isMentioned {
			// reply to mentions with a DM
			fmt.Println("Got a Mention")
			dmChannel, err := s.UserChannelCreate(m.Author.ID)
			if err != nil {
				log.Println("Failed to create DM channel:", err)
			} else {
				s.ChannelMessageSend(dmChannel.ID, "Hai, try talking to me, rather than about me.")
			}
			break contentSwitch
		}

		// look and see if it's a DM to the bot
		channel, err := s.Channel(m.ChannelID)
		if err != nil {
			log.Println("Failed to get message channel ID:", err)
			return
		}
		if channel.Type == discordgo.ChannelTypeDM {
			s.ChannelMessageSend(m.ChannelID, "My brain is being tinkered with... I may be unpredictable")
			d.Recv <- DiscordMessage{ClientID: m.ChannelID, Content: m.Content}
			break contentSwitch
		}
	}
}
