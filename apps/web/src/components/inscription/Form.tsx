import { useState, useEffect } from "react";
import { useAccount } from '@starknet-react/core'
import DropButton from "../DropButton";
import "./Form.css";

function InscriptionForm(props: any) {
  const dropOptions = ["Image", "Message"];
  // const dropOptions = ["Image", "Gif", "Message"];
  const [selectedOption, setSelectedOption] = useState(dropOptions[0]);
  const [uploadedImage, setUploadedImage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { address } = useAccount()

  useEffect(() => {
    setErrorMessage("");
  }, [uploadedImage, address]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
  
    let dataToInscribe = "";
    if (!address) {
      setErrorMessage("Please login with your wallet(s)");
      return;
    }
  
    const taprootAddress = props.taprootAddress;
    if (!taprootAddress) {
      setErrorMessage("Please login with Bitcoin Xverse.");
      return;
    }

    if (selectedOption === "Image") {
      if (!uploadedImage) {
        setErrorMessage("Please upload an image");
        return;
      }
      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      dataToInscribe = base64Image;
    } else if (selectedOption === "Message") {
      const textAreaElement = document.querySelector<HTMLTextAreaElement>(".Form__textarea");
      dataToInscribe = textAreaElement?.value || "";
      if (!dataToInscribe) {
        setErrorMessage("Please enter a message to inscribe");
        return;
      }
    }
  
    // inscriptionData = window.location.origin + "/inscriptions/" + imagePath;
  
    setErrorMessage("");
    await props.requestInscriptionCall(dataToInscribe, taprootAddress, "STRK", 20000);
    props.setIsInscribing(true);
  }
  
  const handleImageUpload = (e: any) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const image = e.target.files[0];
      setUploadedImage(URL.createObjectURL(image));
    } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const image = e.dataTransfer.files[0];
      setUploadedImage(URL.createObjectURL(image));
    }
  }

  const handleImgDrag = (e: any) => {
    e.preventDefault();
  }

  // TODO: disabled button b4 input
  return (
    <form className="flex flex-row items-center justify-center w-full md:w-[80%] lg:w-[60%] xl:w-[40%] px-8" onSubmit={handleSubmit}>
      <div className="flex-grow Form__input">
        {selectedOption === "Image" ? (
          <div>
            <label
              className={`text-lg Form__image ${uploadedImage ? "Form__image--grid" : ""}`}
              htmlFor="image"
              onDrop={handleImageUpload}
              onDragOver={handleImgDrag}
            >
              {uploadedImage ? "Image to Inscribe →" : "Upload an Image..."}{" "}
              {uploadedImage && <img className="Form__image__up" src={uploadedImage} alt="uploaded" />}
            </label>
            <input
              style={{ display: "none" }}
              type="file"
              name="image"
              id="image"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        ) : (
          <textarea
            className="text-lg Form__textarea"
            placeholder="Enter a message to inscribe..."
          />
        )}
      </div>
      <div className="flex flex-row items-center justify-center relative">
        <DropButton
          options={dropOptions}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
        />
        <button
          type="submit"
          className={`button--gradient button__primary ml-4 ${
            !props.taprootAddress || !props.isStarknetConnected
              ? "button__primary--disabled"
              : (selectedOption === "Image" && uploadedImage) || selectedOption === "Message"
                ? "button__primary--pinging"
                : "button__primary--disabled"
          }`}
        >
          Inscribe
        </button>
        {errorMessage && (
          <p className="absolute right-0 translate-x-[110%] text-red-500 text-xs">
            {errorMessage}
          </p>
        )}
      </div>
    </form>
  );  
}

export default InscriptionForm;
