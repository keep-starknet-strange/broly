package routeutils

import (
	"net/http"
	"strings"

	"github.com/keep-starknet-strange/broly/backend/internal/config"
)

func SetupAccessHeaders(w http.ResponseWriter) {
	config := config.Conf.Api

	// TODO: Process multiple origins in the future.
	if len(config.AllowOrigins) > 0 {
		w.Header().Set("Access-Control-Allow-Origin", config.AllowOrigins[0])
	}
	methods := strings.Join(config.AllowMethods, ", ")
	w.Header().Set("Access-Control-Allow-Methods", methods)

	headers := strings.Join(config.AllowHeaders, ", ")
	w.Header().Set("Access-Control-Allow-Headers", headers)
}

func SetupHeaders(w http.ResponseWriter) {
	SetupAccessHeaders(w)
	w.Header().Set("Content-Type", "application/json")
}

func BasicErrorJson(err string) []byte {
	return []byte(`{"error": "` + err + `"}`)
}

func WriteErrorJson(w http.ResponseWriter, errCode int, err string) {
	SetupHeaders(w)
	w.WriteHeader(errCode)
	w.Write(BasicErrorJson(err))
}

func BasicResultJson(result string) []byte {
	return []byte(`{"result": "` + result + `"}`)
}

func WriteResultJson(w http.ResponseWriter, result string) {
	SetupHeaders(w)
	w.WriteHeader(http.StatusOK)
	w.Write(BasicResultJson(result))
}

func BasicDataJson(data string) []byte {
	return []byte(`{"data": ` + data + `}`)
}

func WriteDataJson(w http.ResponseWriter, data string) {
	SetupHeaders(w)
	w.WriteHeader(http.StatusOK)
	w.Write(BasicDataJson(data))
}
