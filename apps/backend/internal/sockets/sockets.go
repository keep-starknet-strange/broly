package sockets

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
)

type WSServer struct {
	WSConnections     []*websocket.Conn
	WSConnectionsLock sync.Mutex
	WsMsgQueue        chan map[string]string
}

var WsServer WSServer

func SendWebSocketMessage(message map[string]string) {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		fmt.Println("Failed to marshal websocket message")
		return
	}
	WsServer.WSConnectionsLock.Lock()
	for idx, conn := range WsServer.WSConnections {
		if err := conn.WriteMessage(websocket.TextMessage, messageBytes); err != nil {
			fmt.Println(err)
			// Remove problematic connection
			conn.Close()
			if idx < len(WsServer.WSConnections) {
				WsServer.WSConnections = append(WsServer.WSConnections[:idx], WsServer.WSConnections[idx+1:]...)
			} else {
				WsServer.WSConnections = WsServer.WSConnections[:idx]
			}
		}
	}
	WsServer.WSConnectionsLock.Unlock()
}

func wsWriter() {
	for {
		msg := <-WsServer.WsMsgQueue
		SendWebSocketMessage(msg)
	}
}

func StartWebsocketServer() {
	go wsWriter()
	go wsWriter()
	go wsWriter()
	go wsWriter()
}

func wsReader(conn *websocket.Conn) {
	for {
		// TODO: exit on close in backend?
		// TODO: handle different message types
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			fmt.Println(err)
			return
		}
		fmt.Println("WS message received: ", messageType, string(p))
	}
}

func CloseWsConnections() {
	for _, conn := range WsServer.WSConnections {
		conn.Close()
	}
}
