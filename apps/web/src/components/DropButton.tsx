import { useState } from "react";
import "./DropButton.css";

function DropButton(props: any) {
  // TODO: Animate the dropdown opening and closing
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="DropButton__container">
      <div className="DropButton" onClick={() => setIsOpen(!isOpen)}>
        <p className="DropButton__label">{props.selectedOption}</p>
        <p className="DropButton__dropdown">▼</p>
      </div>
      {isOpen && (
        <div className="DropButton__options">
          {props.options.map((option: any, index: number) => (
            <p
              className="DropButton__option"
              key={index}
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
