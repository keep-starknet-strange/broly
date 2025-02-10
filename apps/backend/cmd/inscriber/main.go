package main

import (
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"time"

	"github.com/keep-starknet-strange/broly/backend/internal/config"
	"github.com/keep-starknet-strange/broly/backend/internal/scripts"
	"github.com/keep-starknet-strange/broly/backend/routes"
	routeutils "github.com/keep-starknet-strange/broly/backend/routes/utils"
)

type FeeRateResponse struct {
	FastestFee  int `json:"fastestFee"`
	HalfHourFee int `json:"halfHourFee"`
	HourFee     int `json:"hourFee"`
	EconomyFee  int `json:"economyFee"`
	MinimumFee  int `json:"minimumFee"`
}

type BtcToStrkResponse struct {
	Status string  `json:"status"`
	Btc    float64 `json:"BTC"`
	Strk   float64 `json:"STRK"`
}

var strkPerVbyte big.Int

func updateStrkPerVbyte() {
	btcToSats := 100000000.0
	btcToStrkResponse, err := http.Get("https://api.coinconvert.net/convert/btc/strk?amount=1")
	if err != nil {
		fmt.Println("Error while querying the backend for the conversion rate")
		return
	}
	btcToStrkJson, err := routeutils.ReadJsonResponse[BtcToStrkResponse](btcToStrkResponse)
	if err != nil {
		fmt.Println("Error while parsing the response as Json")
		return
	}
	btcToStrk := btcToStrkJson.Strk

	satsFeeRateResponse, err := http.Get("https://mempool.space/api/v1/fees/recommended")
	if err != nil {
		fmt.Println("Error while querying the backend for the fee rate")
		return
	}
	satsFeeRateJson, err := routeutils.ReadJsonResponse[FeeRateResponse](satsFeeRateResponse)
	if err != nil {
		fmt.Println("Error while parsing the response as Json")
		return
	}
	satsFeeRate := float64(satsFeeRateJson.FastestFee)
	strkPerVbyteFloat := satsFeeRate * btcToStrk / btcToSats

	// strkDecimals := big.NewFloat(1000000000000000000) // 10^18
	strkPerVByteU256 := big.NewFloat(strkPerVbyteFloat)
	// strkPerVByteU256.Mul(strkPerVByteU256, strkDecimals)
	strkPerVByteU256.Int(&strkPerVbyte)
}

func InscriberLockingService() {
	sleepTime := 30 // Wait 30 seconds before starting the service
	time.Sleep(time.Duration(sleepTime) * time.Second)

	updateInterval := 60 * 5 // Update every 5 minutes
	timerState := 0
	backendUrl := "http://" + config.Conf.Api.Host + ":" + strconv.Itoa(config.Conf.Api.Port)
	for {
		sleepTime := 10 // Wait 10 seconds before querying the backend
		time.Sleep(time.Duration(sleepTime) * time.Second)

		timerState += sleepTime
		if timerState >= updateInterval {
			updateStrkPerVbyte()
			timerState = 0
		}

		// Query the backend for open inscription requests
		fmt.Println("Querying the backend for open inscription requests with fee rate: ", strkPerVbyte.String())
		getOpenRequestsUrl := backendUrl + "/inscriptions/get-open-requests"
		// getOpenRequestsUrl := backendUrl + "/inscriptions/get-profitable-requests?feeRate=" + strkPerVbyte.String()
		// strconv.FormatFloat(strkPerVbyte, 'f', -1, 64)
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

			fmt.Println("Estimating fee to inscribe: ", responseJson.Data[0].InscriptionId)
			res, err := scripts.EstimateFeeInvokeScript(responseJson.Data[0].InscriptionData)
			if err != nil {
				fmt.Println("Error while estimating the fee to inscribe")
				continue
			}
			if res > responseJson.Data[0].FeeAmount {
				// TODO: Go to next request
				fmt.Printf("Insufficient fee to inscribe: %f < %f\n", res, responseJson.Data[0].FeeAmount)
				continue
			}

			// Inscribe on Bitcoin
			fmt.Println("Inscribing on Bitcoin: ", responseJson.Data[0].InscriptionId)
			err = scripts.RunInscribeScript(responseJson.Data[0].InscriptionData)
			if err != nil {
				fmt.Println("Error while inscribing on Bitcoin", err)
				continue
			}

			// Submit the locked inscription request for completion
			fmt.Println("Submitting inscription: ", responseJson.Data[0])
			txHash := "0x1234567890" // TODO
			err = scripts.SubmitInscriptionInvokeScript(responseJson.Data[0].InscriptionId, txHash)
			if err != nil {
				fmt.Println("Error while invoking the submitInscription script")
				continue
			}

			continue
		}

		// TODO: Estimate fee then check next if insufficent funds
		fmt.Println("Estimating fee to inscribe (lock): ", responseJson.Data[0].InscriptionId)
		res, err := scripts.EstimateFeeInvokeScript(responseJson.Data[0].InscriptionData)
		if err != nil {
			fmt.Println("Error while estimating the fee to inscribe")
			continue
		}
		if res > responseJson.Data[0].FeeAmount {
			// TODO: Go to next request
			fmt.Printf("Insufficient fee to inscribe: %f < %f\n", res, responseJson.Data[0].FeeAmount)
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

	updateStrkPerVbyte()

	// TODO: To go routine and run in parallel with InscriberSubmitService
	InscriberLockingService()
}
