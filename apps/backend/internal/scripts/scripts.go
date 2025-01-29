package scripts

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"

	"gopkg.in/yaml.v3"
)

type ScriptConfig struct {
	LockInscriptionScript   string `yaml:"LockInscriptionScript"`
	SubmitInscriptionScript string `yaml:"SubmitInscriptionScript"`
}

var Conf *ScriptConfig

func InitScriptConfig() {
	configPath, ok := os.LookupEnv("SCRIPT_CONFIG_PATH")
	if !ok {
		configPath = "configs/script-config.yaml"
		fmt.Println("SCRIPT_CONFIG_PATH not set, using default script-config.yaml")
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

func LockInscriptionInvokeScript(inscriptionId int) error {
	shellCmd := Conf.LockInscriptionScript

	cmd := exec.Command(shellCmd, strconv.Itoa(inscriptionId))
	_, err := cmd.Output()
	if err != nil {
		return err
	}

	return nil
}

func SubmitInscriptionInvokeScript(inscriptionId int) error {
	shellCmd := Conf.SubmitInscriptionScript

	cmd := exec.Command(shellCmd, strconv.Itoa(inscriptionId))
	_, err := cmd.Output()
	if err != nil {
		return err
	}

	return nil
}
