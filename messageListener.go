package main

import (
	"math/rand"
	"sync"
)

type messageListenerStore struct {
	sync.RWMutex
	data map[int]messageListener
}

func newMessageListenerStore() (store messageListenerStore) {
	store.data = make(map[int]messageListener)
	return
}

func (store *messageListenerStore) add(listener messageListener) (id int) {
	store.Lock()
	defer store.Unlock()

	ok := false
	for !ok {
		id = rand.Int()
		_, ok = store.data[id]
	}
	listener.id = id
	store.data[id] = listener

	return
}

func (store *messageListenerStore) get(id int) (listener messageListener) {
	store.RLock()
	defer store.RUnlock()

	return store.data[id]
}

type messageListener struct {
	matcher
	id      int
	done    chan bool
	command chan string
}

func (listener *messageListener) listen() {
	for {
		cmd := <-listener.command
		if listener.match(cmd) != nil {
			listener.done <- true
		}
	}
}
