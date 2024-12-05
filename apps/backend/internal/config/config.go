package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type ApiConfig struct {
	Port         int      `yaml:"Port"`
	AllowOrigins []string `yaml:"AllowOrigins"`
	AllowMethods []string `yaml:"AllowMethods"`
	AllowHeaders []string `yaml:"AllowHeaders"`
	Production   bool     `yaml:"Production"`
	Admin        bool     `yaml:"Admin"`
}

type PostgresConfig struct {
	Host string `yaml:"Host"`
	Port int    `yaml:"Port"`
	User string `yaml:"User"`
	Name string `yaml:"Name"`
}

type Config struct {
	Api      ApiConfig      `yaml:"Api"`
	Postgres PostgresConfig `yaml:"Postgres"`
}

var Conf *Config

func InitConfig() {
	configPath, ok := os.LookupEnv("CONFIG_PATH")
	if !ok {
		configPath = "configs/config.yaml"
		fmt.Println("CONFIG_PATH not set, using default config.yaml")
	}

	yamlFile, err := os.ReadFile(configPath)
	if err != nil {
		fmt.Println("Error reading config file: ", err)
		os.Exit(1)
	}

	err = yaml.Unmarshal(yamlFile, &Conf)
	if err != nil {
		fmt.Println("Error parsing config file: ", err)
		os.Exit(1)
	}
}
