package db

import (
	"context"
	"encoding/json"

	"github.com/georgysavva/scany/v2/pgxscan"
)

// PostgresQuery is a helper function to run a query on the Postgres database.
//
//	Generic Param:
//	  RowType - Golang struct with json tags to map the query result.
//	Params:
//	  query - Postgres query string w/ $1, $2, etc. placeholders.
//	  args - Arguments to replace the placeholders in the query.
//	Returns:
//	  []RowType - Slice of RowType structs with the query result.
//	  error - Error if the query fails.
func PostgresQuery[RowType any](query string, args ...interface{}) ([]RowType, error) {
	var result []RowType
	err := pgxscan.Select(context.Background(), Db.Postgres, &result, query, args...)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// Same as PostgresQuery, but only returns the first row.
func PostgresQueryOne[RowType any](query string, args ...interface{}) (*RowType, error) {
	var result RowType
	err := pgxscan.Get(context.Background(), Db.Postgres, &result, query, args...)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

// Same as PostgresQuery, but returns the result as a Marshalled JSON byte array.
func PostgresQueryJson[RowType any](query string, args ...interface{}) ([]byte, error) {
	result, err := PostgresQuery[RowType](query, args...)
	if err != nil {
		return nil, err
	}

	json, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return json, nil
}

// Same as PostgresQueryOne, but returns the result as a Marshalled JSON byte array.
func PostgresQueryOneJson[RowType any](query string, args ...interface{}) ([]byte, error) {
	result, err := PostgresQueryOne[RowType](query, args...)
	if err != nil {
		return nil, err
	}

	json, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}

	return json, nil
}
