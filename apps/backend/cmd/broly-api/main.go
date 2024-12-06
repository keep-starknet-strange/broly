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

	routes.InitRoutes()
	fmt.Println("Listening on port:", config.Conf.Api.Port)
	http.ListenAndServe(fmt.Sprintf(":%d", config.Conf.Api.Port), nil)
	fmt.Println("Server stopped")
}
