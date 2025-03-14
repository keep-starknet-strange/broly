import { useState, useEffect } from "react";
import { useAccount } from '@starknet-react/core';
import "../DropButton.css";
import "./Form.css";

function prepareInscription(marker: string, version: Uint8Array, contentType: string, control: Uint8Array, payloadData: Uint8Array): string {
  const opcodeIf = new Uint8Array([0x63]);
  const markerBuffer = new TextEncoder().encode(marker);
  const markerPush = concatArrays(new Uint8Array([markerBuffer.length]), markerBuffer);
  const contentTypeBuffer = new TextEncoder().encode(contentType);
  const contentTypePush = concatArrays(new Uint8Array([contentTypeBuffer.length]), contentTypeBuffer);
  const opcodeEndIf = new Uint8Array([0x68]);
  const payloadPush = new Uint8Array([payloadData.length]);
  const inscriptionScript = concatArrays(
    opcodeIf,
    markerPush,
    version,
    contentTypePush,
    control,
    payloadPush,
    payloadData,
    opcodeEndIf
  );
  return hexEncode(inscriptionScript);
}

function prepareTextInscription(text: string): string {
  const marker = "ord";
  const version = new Uint8Array([0x01, 0x01]);
  const contentType = "text/plain;charset=utf-8";
  const control = hexDecode("010201000001");
  const payloadData = new TextEncoder().encode(text);
  return prepareInscription(marker, version, contentType, control, payloadData);
}

function prepareImageInscription(imageBuffer: Uint8Array): string {
  const marker = "ord";
  const version = new Uint8Array([0x01, 0x01]);
  const contentType = "image/png";
  const control = hexDecode("010201000001");
  return prepareInscription(marker, version, contentType, control, imageBuffer);
}

function prepareGifInscription(gifBuffer: Uint8Array): string {
  const marker = "ord";
  const version = new Uint8Array([0x01, 0x01]);
  const contentType = "image/gif";
  const control = hexDecode("010201000001");
  return prepareInscription(marker, version, contentType, control, gifBuffer);
}

// Helper functions
function concatArrays(...arrays: Uint8Array[]): Uint8Array {
  let totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  let result = new Uint8Array(totalLength);
  let offset = 0;
  for (let arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function hexEncode(array: Uint8Array): string {
  return Array.from(array)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexDecode(hex: string): Uint8Array {
  let bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64); // Decodes the base64 string to binary
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i); // Converts each character to byte
  }
  return bytes;
}

function InscriptionForm(props: any) {
  const dropOptions = ["Image", "Message", "Gif"];
  const [selectedOption, setSelectedOption] = useState(dropOptions[0]);
  const [uploadedImage, setUploadedImage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [taprootAddressShort, setTaprootAddressShort] = useState("");

  useEffect(() => {
    if (props.taprootAddress) {
      const taprootAddressShort = props.taprootAddress.slice(0, 6) + "..." + props.taprootAddress.slice(-6);
      setTaprootAddressShort(taprootAddressShort);
    }
  }, [props.taprootAddress]);

  const { address } = useAccount();
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
      const base64String = base64Image.split(",")[1];
      const imageBuffer = base64ToArrayBuffer(base64String);
      dataToInscribe = prepareImageInscription(imageBuffer);
    } else if (selectedOption === "Gif") {
      if (!uploadedImage) {
        setErrorMessage("Please upload a GIF");
        return;
      }
      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      const base64Gif = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64String = base64Gif.split(",")[1];
      const gifBuffer = base64ToArrayBuffer(base64String);
      dataToInscribe = prepareGifInscription(gifBuffer);
    } else if (selectedOption === "Message") {
      const textAreaElement = document.querySelector<HTMLTextAreaElement>(".Form__textarea");
      dataToInscribe = textAreaElement?.value || "";
      if (!dataToInscribe) {
        setErrorMessage("Please enter a message to inscribe");
        return;
      }
      dataToInscribe = prepareTextInscription(dataToInscribe);
    }
    setErrorMessage("");
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
    await props.requestInscriptionCall(dataToInscribe, taprootAddress, "STRK", inscribeCostEstimateStrk);
    props.setIsInscribing(true);
  };

  const handleImageUpload = (e: any) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const image = e.target.files[0];
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
  };

  const handleImgDrag = (e: any) => {
    e.preventDefault();
  };

  return (
    <form className="flex flex-col items-center justify-center w-[90%] sm:w-[70%] md:w-[60%] lg:w-[50%] xl:w-[35%] px-8 py-4 gap-2 bg-[var(--color-tertiary-dark)] rounded-xl shadow-xl" onSubmit={handleSubmit}>
      <div className="flex flex-row items-center justify-around gap-2 w-full bg-[var(--color-primary)] rounded-[1.5rem] p-1">
        {dropOptions.map((option, index) => (
          <button
            key={index}
            type="button"
            className={`w-full h-8 ${selectedOption === option ? "Form__selection--selected" : "Form__selection"}`}
            onClick={() => setSelectedOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex-grow Form__input h-[35vh]">
        {(selectedOption === "Image" || selectedOption === "Gif") ? (
          <div>
            <label className="text-xl Form__image" htmlFor="image" onDrop={handleImageUpload} onDragOver={handleImgDrag}>
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
                  <p className="text-xl">Upload an image or gif</p>
                  <p className="text-sm">Max 50kB</p>
                </div>
              )}
            </label>
            <input style={{ display: "none" }} type="file" name="image" id="image" accept="image/*" onChange={handleImageUpload} />
          </div>
        ) : (
          <textarea className="text-lg Form__textarea" placeholder="Enter a message to inscribe..." />
        )}
      </div>
      <div className="relative py-2 flex flex-col gap-4 justify-center items-center w-full">
        {!props.taprootAddress && (
          <button type="button" className="button__secondary--gradient button__secondary text-2xl" onClick={props.bitcoinWallet.connectWallet}>
            Link Xverse
          </button>
        )}
        {props.taprootAddress && (
          <button type="button" className="buttonlike__primary--gradient buttonlike__primary" onClick={props.bitcoinWallet.disconnectWallet}>
            Linked BTC Wallet : {taprootAddressShort}
          </button>
        )}
        <button
          type="submit"
          className={`button--gradient button__primary text-2xl w-min ${!props.taprootAddress || !props.isStarknetConnected ? "button__primary--disabled" : (selectedOption === "Image" && uploadedImage) || (selectedOption === "Gif" && uploadedImage) || selectedOption === "Message" ? "button__primary--pinging" : "button__primary--disabled"}`}
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

export default InscriptionForm;
