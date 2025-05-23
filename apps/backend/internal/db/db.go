package db

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/keep-starknet-strange/broly/backend/internal/config"
)

type Databases struct {
	Postgres *pgxpool.Pool
}

var Db *Databases

func InitDB() {
	Db = &Databases{}

	postgresConnString := "postgresql://" + config.Conf.Postgres.User + ":" + os.Getenv("POSTGRES_PASSWORD") + "@" + config.Conf.Postgres.Host + ":" + strconv.Itoa(config.Conf.Postgres.Port) + "/" + config.Conf.Postgres.Name
	pgPool, err := pgxpool.New(context.Background(), postgresConnString)
	if err != nil {
		fmt.Println("Error connecting to database: ", err)
		os.Exit(1)
	}
	Db.Postgres = pgPool
}

func CloseDB() {
	Db.Postgres.Close()
}
