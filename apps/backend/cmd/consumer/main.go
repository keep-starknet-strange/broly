package main

import (
	"fmt"
	"net/http"

	"github.com/keep-starknet-strange/broly/backend/indexer"
	"github.com/keep-starknet-strange/broly/backend/internal/config"
	"github.com/keep-starknet-strange/broly/backend/internal/db"
)

func main() {
	config.InitConfig()

	db.InitDB()
	defer db.CloseDB()

	indexer.InitIndexerRoutes()
	indexer.StartMessageProcessor()

	fmt.Println("Listening on port:", config.Conf.Consumer.Port)
	http.ListenAndServe(fmt.Sprintf(":%d", config.Conf.Consumer.Port), nil)
	fmt.Println("Server stopped")
}
