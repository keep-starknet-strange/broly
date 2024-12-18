package routes

import (
	"net/http"

	routeutils "github.com/keep-starknet-strange/broly/backend/routes/utils"
)

func InitRoutes() {
	// Base route needed for health checks
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		routeutils.SetupHeaders(w)
		w.WriteHeader(http.StatusOK)
	})
}
