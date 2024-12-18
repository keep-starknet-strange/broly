package routeutils

import (
	"encoding/json"
	"io"
	"net/http"
)

// ReadJsonBody reads the body of an http.Request and unmarshals it into a struct.
//
//	Generic Param:
//	  bodyType: The type of the struct to unmarshal the body into.
//	Parameters:
//	  r: The http.Request to read the body from.
//	Returns:
//	  *bodyType: A pointer to the unmarshaled body.
func ReadJsonBody[bodyType any](r *http.Request) (*bodyType, error) {
	reqBody, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}

	var body bodyType
	err = json.Unmarshal(reqBody, &body)
	if err != nil {
		return nil, err
	}

	return &body, nil
}
