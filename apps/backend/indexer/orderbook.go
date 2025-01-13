package indexer

import (
	"context"
	"encoding/hex"
	"strconv"
	"strings"

	"github.com/keep-starknet-strange/broly/backend/internal/db"
)

func readByteArray(data []string, offset int) (string, int, error) {
  dataLengthHex := data[offset]
  dataLength, err := strconv.ParseInt(dataLengthHex, 0, 64)
  if err != nil {
    return "", 0, err
  }

  dataBody := make([]string, 0)
  for i := 1; i <= int(dataLength); i++ {
    dataBody = append(dataBody, data[offset + i][4:])
  }
  pendingDataFull := data[offset + int(dataLength) + 1][2:]
  pendingDataLenHex := data[offset + int(dataLength) + 2]
  pendingDataLen, err := strconv.ParseInt(pendingDataLenHex, 0, 64)
  if err != nil {
    return "", 0, err
  }
  pendingData := pendingDataFull[len(pendingDataFull) - (int(pendingDataLen) * 2):]

  fullString := ""
  for _, s := range dataBody {
    decodedData, err := hex.DecodeString(s)
    if err != nil {
      return "", 0, err
    }
    fullString += string(decodedData)
  }
  pendingDataStr, err := hex.DecodeString(pendingData)
  if err != nil {
    return "", 0, err
  }
  fullString += string(pendingDataStr)

  return fullString, offset + int(dataLength) + 3, nil
}

func readFeltString(data string) (string, error) {
  decodedData, err := hex.DecodeString(data[2:])
  if err != nil {
    return "", err
  }
  trimmedName := []byte{}
  trimming := true
  for _, b := range decodedData {
    if b == 0 && trimming {
      continue
    }
    trimming = false
    trimmedName = append(trimmedName, b)
  }
  feltString := string(trimmedName)
  return feltString, nil
}

func processRequestCreatedEvent(event IndexerEvent) {
  inscriptionIdHex := event.Event.Keys[1]
  inscriptionId, err := strconv.ParseInt(inscriptionIdHex, 0, 64)
  if err != nil {
    PrintIndexerEventError("processRequestCreatedEvent", event, err)
    return
  }
  caller := event.Event.Keys[2][2:] // remove 0x prefix

  offset := 0
  inscriptionData, offset, err := readByteArray(event.Event.Data, 0)
  if err != nil {
    PrintIndexerEventError("processRequestCreatedEvent", event, err)
    return
  }
  // Split inscriptionData into inscriptionType and inscriptionData like <inscriptionType>:<inscriptionData>
  inscriptionDataParts := strings.Split(inscriptionData, ":")
  inscriptionType := ""
  if len(inscriptionDataParts) > 1 {
    inscriptionType = inscriptionDataParts[0]
    inscriptionData = strings.Join(inscriptionDataParts[1:], ":")
  } else {
    inscriptionType = "unknown"
  }
  bitcoinAddress, offset, err := readByteArray(event.Event.Data, offset)
  if err != nil {
    PrintIndexerEventError("processRequestCreatedEvent", event, err)
    return
  }
  feeToken, err := readFeltString(event.Event.Data[offset])
  if err != nil {
    PrintIndexerEventError("processRequestCreatedEvent", event, err)
    return
  }
  feeAmountHex := event.Event.Data[offset + 1]
  feeAmount, err := strconv.ParseInt(feeAmountHex, 0, 64)
  if err != nil {
    PrintIndexerEventError("processRequestCreatedEvent", event, err)
    return
  }

  // Insert into Postgres
  _, err = db.Db.Postgres.Exec(context.Background(),  "INSERT INTO InscriptionRequests (inscription_id, requester, bitcoin_address, fee_token, fee_amount) VALUES ($1, $2, $3, $4, $5)", inscriptionId, caller, bitcoinAddress, feeToken, feeAmount)
  if err != nil {
    PrintIndexerEventError("processRequestCreatedEvent", event, err)
    return
  }

  _, err = db.Db.Postgres.Exec(context.Background(),  "INSERT INTO InscriptionRequestsData (inscription_id, type, inscription_data) VALUES ($1, $2, $3)", inscriptionId, inscriptionType, inscriptionData)
  if err != nil {
    PrintIndexerEventError("processRequestCreatedEvent", event, err)
    return
  }

  _, err = db.Db.Postgres.Exec(context.Background(),  "INSERT INTO InscriptionRequestsStatus (inscription_id, status) VALUES ($1, 0)", inscriptionId)
  if err != nil {
    PrintIndexerEventError("processRequestCreatedEvent", event, err)
    return
  }
}

func revertRequestCreatedEvent(event IndexerEvent) {
  inscriptionIdHex := event.Event.Keys[1]
  inscriptionId, err := strconv.ParseInt(inscriptionIdHex, 0, 64)
  if err != nil {
    PrintIndexerEventError("revertRequestCreatedEvent", event, err)
    return
  }

  // Insert into Postgres
  _, err = db.Db.Postgres.Exec(context.Background(), "DELETE FROM InscriptionRequests WHERE inscription_id = $1", inscriptionId)
  if err != nil {
    PrintIndexerEventError("revertRequestCreatedEvent", event, err)
    return
  }

  _, err = db.Db.Postgres.Exec(context.Background(), "DELETE FROM InscriptionRequestsData WHERE inscription_id = $1", inscriptionId)
  if err != nil {
    PrintIndexerEventError("revertRequestCreatedEvent", event, err)
    return
  }

  _, err = db.Db.Postgres.Exec(context.Background(), "DELETE FROM InscriptionRequestsStatus WHERE inscription_id = $1", inscriptionId)
  if err != nil {
    PrintIndexerEventError("revertRequestCreatedEvent", event, err)
    return
  }
}

func processRequestLockedEvent(event IndexerEvent) {
  inscriptionIdHex := event.Event.Keys[1]
  inscriptionId, err := strconv.ParseInt(inscriptionIdHex, 0, 64)
  if err != nil {
    PrintIndexerEventError("processRequestLockedEvent", event, err)
    return
  }

  // TODO: Interpret tx_hash data

  // Insert into Postgres
  _, err = db.Db.Postgres.Exec(context.Background(), "UPDATE InscriptionRequestsStatus SET status = 1 WHERE inscription_id = $1", inscriptionId)
  if err != nil {
    PrintIndexerEventError("processRequestLockedEvent", event, err)
    return
  }
}

func revertRequestLockedEvent(event IndexerEvent) {
  inscriptionIdHex := event.Event.Keys[1]
  inscriptionId, err := strconv.ParseInt(inscriptionIdHex, 0, 64)
  if err != nil {
    PrintIndexerEventError("revertRequestLockedEvent", event, err)
    return
  }

  // Insert into Postgres
  _, err = db.Db.Postgres.Exec(context.Background(), "UPDATE InscriptionRequestsStatus SET status = 0 WHERE inscription_id = $1", inscriptionId)
  if err != nil {
    PrintIndexerEventError("revertRequestLockedEvent", event, err)
    return
  }
}
