import { useState } from "react";
import DropButton from "../DropButton";

function InscriptionForm(props: any) {
  const dropOptions = ["Image", "Text"];
  const [selectedOption, setSelectedOption] = useState(dropOptions[0]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    props.setIsInscribing(true);
  };

  return (
    <form className="flex flex-row items-center w-[40%]" onSubmit={handleSubmit}>
      <div className="flex-grow">
        {selectedOption === "Image" ? (
          <input type="file" name="image" id="image" accept="image/*" />
        ) : (
          <input type="text" name="text" id="text" />
        )}
      </div>
      <div className="flex flex-row items-center justify-center">
        <DropButton options={dropOptions} selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
        <button type="submit" className="button__submit ml-4">
          Inscribe
        </button>
      </div>
    </form>
  );
}

export default InscriptionForm;
