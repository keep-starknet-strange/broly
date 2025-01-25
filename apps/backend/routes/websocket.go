package routes

import (
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/keep-starknet-strange/broly/backend/internal/sockets"
	routeutils "github.com/keep-starknet-strange/broly/backend/routes/utils"
)

var WsMsgQueue chan map[string]string

func InitWebsocketRoutes() {
	WsMsgQueue = make(chan map[string]string, 10000)
	http.HandleFunc("/ws", wsEndpoint)
	http.HandleFunc("/ws-msg", wsMsgEndpoint)
}

func wsMsgEndpoint(w http.ResponseWriter, r *http.Request) {
	// TODO: Only allow consumer to send messages
	msg, err := routeutils.ReadJsonBody[map[string]string](r)
	if err != nil {
		routeutils.WriteErrorJson(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	WsMsgQueue <- *msg
	routeutils.WriteResultJson(w, "WS message added to queue")
}

func wsWriter() {
	for {
		msg := <-WsMsgQueue
		sockets.SendWebSocketMessage(msg)
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

// TODO: config for upgrader
func wsEndpoint(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}

	sockets.WsServer.WSConnectionsLock.Lock()
	sockets.WsServer.WSConnections = append(sockets.WsServer.WSConnections, ws)
	sockets.WsServer.WSConnectionsLock.Unlock()
	wsReader(ws)
}
