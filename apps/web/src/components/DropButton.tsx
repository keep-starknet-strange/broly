import { useState } from "react";
import "./DropButton.css";

function DropButton(props: any) {
  // TODO: Animate the dropdown opening and closing
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="DropButton" onClick={() => setIsOpen(!isOpen)}>
      <p className="DropButton__label">{props.selectedOption}</p>
      <p className="DropButton__dropdown">▼</p>
      {isOpen && (
        <div className="DropButton__options">
          {props.options.map((option: any) => (
            <p
              className="DropButton__option"
              onClick={() => {
                props.setSelectedOption(option);
                setIsOpen(false);
              }}
            >
              {option}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropButton;
