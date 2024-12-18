import { useState } from "react";
import DropButton from "../DropButton";
import "./Form.css";

function InscriptionForm(props: any) {
  const dropOptions = ["Image", "Message"];
  const [selectedOption, setSelectedOption] = useState(dropOptions[0]);
  const [uploadedImage, setUploadedImage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!uploadedImage) {
      setErrorMessage("Please upload an image");
      return;
    }
    await props.requestInscriptionCall();
    props.setIsInscribing(true);
  };

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
    <form className="flex flex-row items-center w-[40%]" onSubmit={handleSubmit}>
      <div className="flex-grow Form__input">
        {selectedOption === "Image" ? (
          <div>
            <label className={`text-lg Form__image ${uploadedImage ? "Form__image--grid" : ""}`} htmlFor="image" onDrop={handleImageUpload} onDragOver={handleImgDrag}>
              {uploadedImage ? "Image to Inscribe →" : "Upload an Image..."} {uploadedImage && <img className="Form__image__up" src={uploadedImage} alt="uploaded" />}
            </label>
            <input style={{display: 'none'}} type="file" name="image" id="image" accept="image/*" onChange={handleImageUpload}/>
          </div>
        ) : (
          <textarea className="text-lg Form__textarea" placeholder="Enter a message to inscribe..." />
        )}
      </div>
      <div className="flex flex-row items-center justify-center relative">
        <DropButton options={dropOptions} selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
        <button type="submit" className={`button--gradient button__primary ml-4 ${uploadedImage ? "button__primary--pinging": "button__primary--disabled"}`}>
          Inscribe
        </button>
        {errorMessage &&
          <p className="absolute right-0 translate-x-[110%] text-red-500 text-xs">
            {errorMessage}
          </p>
        }
      </div>
    </form>
  );
}

export default InscriptionForm;
