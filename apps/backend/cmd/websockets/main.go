package main

import (
	"fmt"
	"net/http"

	"github.com/keep-starknet-strange/broly/backend/internal/config"
	"github.com/keep-starknet-strange/broly/backend/internal/db"
	"github.com/keep-starknet-strange/broly/backend/routes"
)

func main() {
	config.InitConfig()

	db.InitDB()
	defer db.CloseDB()

	routes.InitBaseRoutes()
	routes.InitWebsocketRoutes()
	routes.StartWebsocketServer()

	fmt.Println("Listening on port:", config.Conf.Websocket.Port)
	http.ListenAndServe(fmt.Sprintf(":%d", config.Conf.Websocket.Port), nil)
	fmt.Println("Server stopped")
}
