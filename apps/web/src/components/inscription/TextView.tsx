import { useState } from "react";

function InscriptionTextView(props: any) {
  // TODO: Traits and info on RHS?
  // TODO: Text centering?
  const [_isHovering, setIsHovering] = useState<boolean>(false);
  return (
    <div className="flex flex-col items-center justify-center h-full" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <h3 className={`text-lg View__header h-8 hidden`}>Message</h3>
      <div className="flex flex-row justify-center h-full w-full h-60 overflow-y-scroll">
        <p className="whitespace-pre-line px-4 py-2 flex-grow text-2xl">
          {props.inscription.inscription_data}
        </p>
        {false && (
          <div className="flex flex-col items-center justify-around h-full px-4">
            <p>Normal</p>
            <p>800,000</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default InscriptionTextView;
