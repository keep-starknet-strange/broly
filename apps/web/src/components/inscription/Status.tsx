import { useEffect, useState } from "react";
import "./Status.css";

function InscriptionStatus(props: any) {
  const [requestClass, setRequestClass] = useState("--active");
  const [waitingClass, setWaitingClass] = useState("--pending");
  const [inscriptorClass, setInscriptorClass] = useState("");
  const [bitcoinClass, setBitcoinClass] = useState("");
  const [completeClass, setCompleteClass] = useState("");
  useEffect(() => {
    if (props.status === -1) {
      setRequestClass("--cancel");
      setWaitingClass("--cancel");
      setInscriptorClass("--cancel");
      setBitcoinClass("--cancel");
      setCompleteClass("--cancel");
    } else if (props.status === 0) {
      setRequestClass("--active");
      setWaitingClass("--pending");
      setInscriptorClass("");
      setBitcoinClass("");
      setCompleteClass("");
    } else if (props.status === 1) {
      setRequestClass("--active");
      setWaitingClass("--active");
      setInscriptorClass("--active");
      setBitcoinClass("--pending");
      setCompleteClass("");
    } else if (props.status === 2) {
      setRequestClass("--active");
      setWaitingClass("--active");
      setInscriptorClass("--active");
      setBitcoinClass("--active");
      setCompleteClass("--active");
    }
  }, [props.status]);
  return (
    <div className="w-full flex flex-row justify-center items-center mt-10 mb-2">
      <div className="mx-1 flex-grow h-0.5 rounded-lg"></div>
      <div className="flex flex-col items-center">
        <div className={`InscriptionStatus__dot${requestClass} w-2 h-2 rounded-full relative`}>
          <p className={`InscriptionStatus__text${requestClass} text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center`}>Requested on Starknet</p>
        </div>
      </div>
      <div className={`mx-2 flex-grow h-0.5 bg-gray-400 rounded-lg InscriptionStatus__line${requestClass}`}></div>
      <div className="flex flex-col items-center">
        <div className={`InscriptionStatus__dot${waitingClass} w-2 h-2 rounded-full relative`}>
          <p className={`InscriptionStatus__text${waitingClass} text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center`}>Waiting for Inscriptor</p>
        </div>
      </div>
      <div className={`mx-2 flex-grow h-0.5 bg-gray-400 rounded-lg InscriptionStatus__line${waitingClass}`}></div>
      <div className="flex flex-col items-center">
        <div className={`InscriptionStatus__dot${inscriptorClass} w-2 h-2 bg-gray-400 rounded-full relative`}>
          <p className={`InscriptionStatus__text${inscriptorClass} text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center`}>Inscriptor Accepted</p>
        </div>
      </div>
      <div className={`mx-2 flex-grow h-0.5 bg-gray-400 rounded-lg InscriptionStatus__line${inscriptorClass}`}></div>
      <div className="flex flex-col items-center">
        <div className={`InscriptionStatus__dot${bitcoinClass} w-2 h-2 bg-gray-400 rounded-full relative`}>
          <p className={`InscriptionStatus__text${bitcoinClass} text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center`}>Inscribing on Bitcoin</p>
        </div>
      </div>
      <div className={`mx-2 flex-grow h-0.5 bg-gray-400 rounded-lg InscriptionStatus__line${bitcoinClass}`}></div>
      <div className="flex flex-col items-center">
        <div className={`InscriptionStatus__dot${completeClass} w-2 h-2 bg-gray-400 rounded-full relative`}>
          <p className={`InscriptionStatus__text${completeClass} text-xs text-wrap w-[8rem] text-center absolute top-[100%] left-[-4rem] origin-center`}>Request Complete</p>
        </div>
      </div>
      <div className="mx-1 flex-grow h-0.5 rounded-lg"></div>
    </div>
  );
}

export default InscriptionStatus;
