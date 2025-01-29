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
	sleepTime := 30 // Wait 30 seconds before starting the service
	time.Sleep(time.Duration(sleepTime) * time.Second)

	backendUrl := "http://" + config.Conf.Api.Host + ":" + strconv.Itoa(config.Conf.Api.Port)
	for {
		sleepTime := 5 // Wait 5 seconds before querying the backend
		time.Sleep(time.Duration(sleepTime) * time.Second)

		// Query the backend for open inscription requests
		getOpenRequestsUrl := backendUrl + "/inscriptions/get-open-requests"
		response, err := http.Get(getOpenRequestsUrl) // TODO: Use pagination
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

			// Query the backend for locked inscription requests
			getLockedRequestsUrl := backendUrl + "/inscriptions/get-locked-requests"
			response, err := http.Get(getLockedRequestsUrl) // TODO: Use pagination
			if err != nil {
				fmt.Println("Error while querying the backend for locked inscription requests")
				continue
			}

			// Parse the response as Json
			responseJson, err := routeutils.ReadJsonDataResponse[[]routes.InscriptionRequest](response)
			if err != nil {
				fmt.Println("Error while parsing the response as Json")
				continue
			}

			// TODO: Only submit requests I have locked
			if len(responseJson.Data) == 0 {
				fmt.Println("No locked inscription requests")
				continue
			}

			// Submit the locked inscription request for completion
			fmt.Println("Submitting inscription: ", responseJson.Data[0])
			err = scripts.SubmitInscriptionInvokeScript(responseJson.Data[0].InscriptionId)
			if err != nil {
				fmt.Println("Error while invoking the submitInscription script")
				continue
			}

			continue
		}

		// TODO: Determine which requests to use
		// Lock the inscription request
		fmt.Println("Locking inscription request: ", responseJson.Data[0])
		err = scripts.LockInscriptionInvokeScript(responseJson.Data[0].InscriptionId)
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
