package routes

import (
	"net/http"

	routeutils "github.com/keep-starknet-strange/broly/backend/routes/utils"
)

func InitBaseRoutes() {
  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    routeutils.SetupHeaders(w)
    w.WriteHeader(http.StatusOK)
  })
}

func InitRoutes() {
	// Base route needed for health checks
  InitBaseRoutes()
	InitInscriptionsRoutes()
}
