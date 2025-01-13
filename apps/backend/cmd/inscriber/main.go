package main

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/keep-starknet-strange/broly/backend/internal/config"
	"github.com/keep-starknet-strange/broly/backend/internal/scripts"
	"github.com/keep-starknet-strange/broly/backend/routes"
	routeutils "github.com/keep-starknet-strange/broly/backend/routes/utils"
)

func InscriberLockingService() {
  for {
    sleepTime := 10
    time.Sleep(time.Duration(sleepTime) * time.Second)

    // Query the backend for open inscription requests
    backendUrl := "http://" + config.Conf.Api.Host + ":" + strconv.Itoa(config.Conf.Api.Port) + "/inscriptions/get-open-requests"
    response, err := http.Get(backendUrl) // TODO: Use pagination
    if err != nil {
      fmt.Println("Error while querying the backend for open inscription requests")
      continue
    }

    // Parse the response as Json
    responseJson, err := routeutils.ReadJsonDataResponse[[]routes.InscriptionRequest](response)
    if err != nil {
      fmt.Println("Error while parsing the response as Json")
      continue
    }

    if len(responseJson.Data) == 0 {
      fmt.Println("No open inscription requests")
      continue
    }

    // TODO: Determine which requests to use
    // Lock the inscription request
    fmt.Println("Locking inscription request: ", responseJson.Data[0])
    txHash := "0x1234567890" // TODO
    err = scripts.LockInscriptionInvokeScript(responseJson.Data[0].InscriptionId, txHash)
    if err != nil {
      fmt.Println("Error while invoking the lockInscription script")
      continue
    }
  }
}

func main() {
	config.InitConfig()
  scripts.InitScriptConfig()

  // TODO: To go routine and run in parallel with InscriberSubmitService
  InscriberLockingService()
}
