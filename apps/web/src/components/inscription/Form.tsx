import { useState, useEffect } from "react";
import { useAccount } from '@starknet-react/core'
import "../DropButton.css";
import "./Form.css";

function InscriptionForm(props: any) {
  const dropOptions = ["Image", "Message", "Gif"];
  // const dropOptions = ["Image", "Gif", "Message"];
  const [selectedOption, setSelectedOption] = useState(dropOptions[0]);
  const [uploadedImage, setUploadedImage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { address } = useAccount()

  useEffect(() => {
    setTimeout(() => {
      setErrorMessage("");
    }, 500);
  }, [address, props.taprootAddress]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
  
    let dataToInscribe = "";
    if (!address) {
      setErrorMessage("Please login to inscribe");
      props.starknetWallet.connectWallet();
      return;
    }
  
    const taprootAddress = props.taprootAddress;
    if (!taprootAddress) {
      setErrorMessage("Please link your Bitcoin Wallet (Xverse)");
      props.bitcoinWallet.connectWallet();
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
    // TODO: Use a backend route to estimate the inscription cost
    const inscriptionSize = dataToInscribe.length;
    const constantTxSize = 1000;
    const lenientScalingFactor = 1.1;
    const inscribeTxVbytesEstimate = ((inscriptionSize / 4) + constantTxSize) * lenientScalingFactor;
    const feeRateResponse = await fetch("https://mempool.space/api/v1/fees/recommended");
    const feeRateData = await feeRateResponse.json();
    const feeRateEstimate = feeRateData.halfHourFee;
    const incribeCostEstimate = feeRateEstimate * inscribeTxVbytesEstimate;
    const btcToSat = 100000000;
    const btcToStrkResponse = await fetch("https://api.coinconvert.net/convert/btc/strk?amount=1");
    const btcToStrkData = await btcToStrkResponse.json();
    const btcToStrk = btcToStrkData.STRK;
    const inscribeCostEstimateStrk = incribeCostEstimate * btcToStrk / btcToSat;
    // TODO: STRK to u256 strk ( * 10^18? )
    await props.requestInscriptionCall(dataToInscribe, taprootAddress, "STRK", inscribeCostEstimateStrk);
    props.setIsInscribing(true);
  }
  
  const handleImageUpload = (e: any) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const image = e.target.files[0];
      // Check image size
      const imageObj = new Image();
      imageObj.src = URL.createObjectURL(image);
      imageObj.onload = () => {
        const size = image.size;
        const maxImageBytes = 50000;
        if (size > maxImageBytes) {
          setErrorMessage("Image too large. Max 50kB");
          setUploadedImage("");
          return;
        }
        setErrorMessage("");
        setUploadedImage(URL.createObjectURL(image));
      };
      setErrorMessage("");
      setUploadedImage(URL.createObjectURL(image));
    } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const image = e.dataTransfer.files[0];
      setErrorMessage("");
      setUploadedImage(URL.createObjectURL(image));
    }
  }

  const handleImgDrag = (e: any) => {
    e.preventDefault();
  }

  // TODO: disabled button b4 input
  return (
    <form className="flex flex-col items-center justify-center w-[90%] sm:w-[70%] md:w-[60%] lg:w-[50%] xl:w-[35%] px-8 py-4 gap-2 bg-[var(--color-tertiary-dark)] rounded-xl shadow-xl" onSubmit={handleSubmit}>
      <div className="flex flex-row items-center justify-around gap-2 w-full bg-[var(--color-primary)] rounded-[1.5rem] p-1">
        {dropOptions.map((option, index) => (
          <button
            key={index}
            type="button"
            className={`w-full h-8 ${
              selectedOption === option ? "Form__selection--selected" : "Form__selection"
            }`}
            onClick={() => setSelectedOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex-grow Form__input h-[35vh]">
        {selectedOption === "Image" ? (
          <div>
            <label
              className="text-xl Form__image"
              htmlFor="image"
              onDrop={handleImageUpload}
              onDragOver={handleImgDrag}
            >
              {uploadedImage ? (
                <div className="flex flex-col items-center justify-center w-full h-full gap-1 relative">
                  <img src={uploadedImage} alt="uploaded" className="w-[80%] h-[80%] object-contain" style={{ imageRendering: "pixelated" }} />
                  <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200 rounded-[1rem]">
                    <img src="/icons/edit.png" alt="edit" className="absolute top-[50%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] w-12 h-12" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full gap-1">
                  <img src="/icons/upload.png" alt="plus" className="w-6 h-6" />
                  <p className="text-xl">Upload an image</p>
                  <p className="text-sm">Max 50kB</p>
                </div>
              )}
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
      <div className="relative py-2">
        <button
          type="submit"
          className={`button--gradient button__primary text-2xl ${
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
          <div className="absolute bottom-[-1rem] transform -translate-x-1/2 left-1/2">
          <p className="text-red-500 text-md text-center text-nowrap">
            {errorMessage}
          </p>
          </div>
        )}
      </div>
    </form>
  );
}

/*
        <select
          className="text-lg Form__select"
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
        >
          {dropOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
*/
export default InscriptionForm;
