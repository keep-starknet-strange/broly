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
  BitcoinAddress string `json:"bitcoin_address"`
  FeeToken string `json:"fee_token"`
  FeeAmount int `json:"fee_amount"`
  Type string `json:"type"`
  InscriptionData string `json:"inscription_data"`
  Status string `json:"status"`
}

func InitInscriptionsRoutes() {
  http.HandleFunc("/inscriptions/get-my-requests", getMyInscriptionRequests)
  http.HandleFunc("/inscriptions/get-requests", getInscriptionRequests)
  http.HandleFunc("/inscriptions/get-open-requests", getOpenInscriptionRequests)
  http.HandleFunc("/inscriptions/get-request", getInscriptionRequest)
  http.HandleFunc("/inscriptions/upload-image", uploadInsciptionImage)

  http.Handle("/inscriptions/", http.StripPrefix("/inscriptions/", http.FileServer(http.Dir("./inscriptions/images"))))
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

  query := "SELECT r.*, d.type, d.inscription_data, s.status FROM InscriptionRequests r LEFT JOIN InscriptionRequestsData d ON r.inscription_id = d.inscription_id LEFT JOIN InscriptionRequestsStatus s ON r.inscription_id = s.inscription_id WHERE requester = $1 ORDER BY r.inscription_id ASC LIMIT $2 OFFSET $3"
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

  query := "SELECT r.*, d.type, d.inscription_data, s.status FROM InscriptionRequests r LEFT JOIN InscriptionRequestsData d ON r.inscription_id = d.inscription_id LEFT JOIN InscriptionRequestsStatus s ON r.inscription_id = s.inscription_id ORDER BY r.inscription_id ASC LIMIT $1 OFFSET $2"
  requests, err := db.PostgresQueryJson[InscriptionRequest](query, pageLength, offset)
  if err != nil {
    routeutils.WriteErrorJson(w, http.StatusInternalServerError, "Error getting inscription requests")
    return
  }
  routeutils.WriteDataJson(w, string(requests))
}

func getOpenInscriptionRequests(w http.ResponseWriter, r *http.Request) {
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

  query := "SELECT r.*, d.type, d.inscription_data, s.status FROM InscriptionRequests r LEFT JOIN InscriptionRequestsData d ON r.inscription_id = d.inscription_id LEFT JOIN InscriptionRequestsStatus s ON r.inscription_id = s.inscription_id WHERE s.status = 0 ORDER BY r.inscription_id ASC LIMIT $1 OFFSET $2"
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

  query := "SELECT r.*, d.type, d.inscription_data, s.status FROM InscriptionRequests r LEFT JOIN InscriptionRequestsData d ON r.inscription_id = d.inscription_id LEFT JOIN InscriptionRequestsStatus s ON r.inscription_id = s.inscription_id WHERE r.inscription_id = $1"
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

    err = os.Mkdir("inscriptions/images", os.ModePerm)
    if err != nil {
      routeutils.WriteErrorJson(w, http.StatusInternalServerError, "Error creating inscriptions/images folder")
      return
    }
  }

  // TODO: Validate file extension
  fileExt := fHeader.Filename[strings.LastIndex(fHeader.Filename, "."):]
  filename := fmt.Sprintf("inscriptions/images/%x%s", hash, fileExt)
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
