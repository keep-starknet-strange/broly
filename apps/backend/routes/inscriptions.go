package routes

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/keep-starknet-strange/broly/backend/internal/db"
	routeutils "github.com/keep-starknet-strange/broly/backend/routes/utils"
)

type InscriptionRequest struct {
  InscriptionId int `json:"inscription_id"`
  Requester string `json:"requester"`
  Type string `json:"type"`
  InscriptionData string `json:"inscription_data"`
  BitcoinAddress string `json:"bitcoin_address"`
  FeeToken string `json:"fee_token"`
  FeeAmount int `json:"fee_amount"`
}

func InitInscriptionsRoutes() {
  http.HandleFunc("/inscriptions/get-my-requests", getMyInscriptionRequests)
  http.HandleFunc("/inscriptions/get-requests", getInscriptionRequests)
  http.HandleFunc("/inscriptions/get-request", getInscriptionRequest)
  http.HandleFunc("/inscriptions/upload-image", uploadInsciptionImage)
}

func getMyInscriptionRequests(w http.ResponseWriter, r *http.Request) {
  address := r.URL.Query().Get("address")
  pageLength, err := strconv.Atoi(r.URL.Query().Get("pageLength"))
  if err != nil || pageLength <= 0 {
    pageLength = 10
  }
  if pageLength > 30 {
    pageLength = 30
  }
  page, err := strconv.Atoi(r.URL.Query().Get("page"))
  if err != nil || page <= 0 {
    page = 1
  }
  offset := (page - 1) * pageLength

  query := "SELECT * FROM InscriptionRequests WHERE requester = $1 ORDER BY inscription_id ASC LIMIT $2 OFFSET $3"
  requests, err := db.PostgresQueryJson[InscriptionRequest](query, address, pageLength, offset)
  if err != nil {
    routeutils.WriteErrorJson(w, http.StatusInternalServerError, "Error getting inscription requests")
    return
  }
  routeutils.WriteDataJson(w, string(requests))
}

func getInscriptionRequests(w http.ResponseWriter, r *http.Request) {
  pageLength, err := strconv.Atoi(r.URL.Query().Get("pageLength"))
  if err != nil || pageLength <= 0 {
    pageLength = 10
  }
  if pageLength > 30 {
    pageLength = 30
  }
  page, err := strconv.Atoi(r.URL.Query().Get("page"))
  if err != nil || page <= 0 {
    page = 1
  }
  offset := (page - 1) * pageLength

  query := "SELECT * FROM InscriptionRequests ORDER BY inscription_id ASC LIMIT $1 OFFSET $2"
  requests, err := db.PostgresQueryJson[InscriptionRequest](query, pageLength, offset)
  if err != nil {
    routeutils.WriteErrorJson(w, http.StatusInternalServerError, "Error getting inscription requests")
    return
  }
  routeutils.WriteDataJson(w, string(requests))
}

func getInscriptionRequest(w http.ResponseWriter, r *http.Request) {
  id, err := strconv.Atoi(r.URL.Query().Get("id"))
  if err != nil {
    routeutils.WriteErrorJson(w, http.StatusBadRequest, "Invalid inscription id")
    return
  }

  query := "SELECT * FROM InscriptionRequests WHERE inscription_id = $1"
  requests, err := db.PostgresQueryJson[InscriptionRequest](query, id)
  if err != nil {
    routeutils.WriteErrorJson(w, http.StatusInternalServerError, "Error getting inscription request")
    return
  }
  if len(requests) == 0 {
    routeutils.WriteErrorJson(w, http.StatusNotFound, "Inscription request not found")
    return
  }
  routeutils.WriteDataJson(w, string(requests[0]))
}

func uploadInsciptionImage(w http.ResponseWriter, r *http.Request) {
  file, fHeader, err := r.FormFile("image")
  if err != nil {
    routeutils.WriteErrorJson(w, http.StatusBadRequest, "Error uploading image")
    return
  }
  defer file.Close()

  r.ParseForm()

  // Get hash of the image data
  fileBytes, err := io.ReadAll(file)
  if err != nil {
    routeutils.WriteErrorJson(w, http.StatusInternalServerError, "Error reading image data")
    return
  }
  hash := sha256.Sum256(fileBytes)

  // Save image to disk
  if _, err := os.Stat("inscriptions"); os.IsNotExist(err) {
    err = os.Mkdir("inscriptions", os.ModePerm)
    if err != nil {
      routeutils.WriteErrorJson(w, http.StatusInternalServerError, "Error creating inscriptions folder")
      return
    }
  }

  // TODO: Validate file extension
  fileExt := fHeader.Filename[strings.LastIndex(fHeader.Filename, "."):]
  filename := fmt.Sprintf("inscriptions/%x%s", hash, fileExt)
  newFile, err := os.Create(filename)
  if err != nil {
    routeutils.WriteErrorJson(w, http.StatusInternalServerError, "Error creating image file")
    return
  }
  defer newFile.Close()

  _, err = newFile.Write(fileBytes)
  if err != nil {
    routeutils.WriteErrorJson(w, http.StatusInternalServerError, "Error writing image file")
    return
  }

  routeutils.WriteResultJson(w, hex.EncodeToString(hash[:]))
}
