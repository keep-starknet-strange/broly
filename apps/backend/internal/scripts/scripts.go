package scripts

import (
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

type ScriptConfig struct {
	LockInscriptionScript   string `yaml:"LockInscriptionScript"`
	SubmitInscriptionScript string `yaml:"SubmitInscriptionScript"`
	InscribeScript          string `yaml:"InscribeScript"`
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

func DecodeBase64(base64Data string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(base64Data)
}

func RunInscribeScript(inscriptionData string) error {
	shellCmd := Conf.InscribeScript

	// inscriptionData in a format like: image/png;base64,iVBORw0KGgoA...
	dataPrefix := strings.Split(inscriptionData, ",")[0]
	fileType := strings.Split(dataPrefix, ";")[0]
	encoding := strings.Split(dataPrefix, ";")[1]

	if fileType != "image/png" && fileType != "image/jpeg" {
		return fmt.Errorf("Only image/png or image/jpeg file types are supported")
	}
	if encoding != "base64" {
		return fmt.Errorf("Only base64 encoding is supported")
	}

	// Write the data to a temporary file
	var tmpFile *os.File
	var err error
	if fileType == "image/png" {
		tmpFile, err = os.CreateTemp("", "inscription-*.png")
	} else if fileType == "image/jpeg" {
		tmpFile, err = os.CreateTemp("", "inscription-*.jpeg")
	}
	if err != nil {
		return err
	}
	defer tmpFile.Close()

	base64Data := strings.Split(inscriptionData, ",")[1]
	decodedInscriptionData, err := DecodeBase64(base64Data)
	if err != nil {
		return err
	}

	_, err = tmpFile.Write(decodedInscriptionData)
	if err != nil {
		return err
	}

	cmd := exec.Command(shellCmd, tmpFile.Name())
	_, err = cmd.Output()
	if err != nil {
		return err
	}

	// Remove the temporary file
	err = os.Remove(tmpFile.Name())
	if err != nil {
		return err
	}

	return nil
}
