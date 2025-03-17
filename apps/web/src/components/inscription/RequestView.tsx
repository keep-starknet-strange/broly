import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import InscriptionTextView from "./TextView";
import InscriptionImageView from "./ImageView";
import { parseBitcoinInscriptionData } from "./utils";
import "./View.css";

function InscriptionRequestView(props: any) {
  const [processedInscription, setProcessedInscription] = useState(props.inscription);
  useEffect(() => {
    let newProcessedInscription = { ...props.inscription }
    // Try to parse type and data from inscription_data
    if (props.inscription.inscription_data) {
      try {
        const { type, inscriptionData } = parseBitcoinInscriptionData(props.inscription.inscription_data);
        newProcessedInscription.type = type;
        newProcessedInscription.inscription_data = inscriptionData;
      } catch (e) {
        console.error("Error parsing inscription_data:", e);
      }
    }
    setProcessedInscription(newProcessedInscription);
  }, [props.inscription]);
  return (
    <div className="View__container z-10">
      <NavLink to={`/request/${processedInscription.inscription_id}`}>
        {processedInscription.type === "text" || processedInscription.type === "unknown" ? (
          <InscriptionTextView inscription={processedInscription} />
        ) : (
          <InscriptionImageView inscription={processedInscription} />
        )}
      </NavLink>
    </div>
  );
}

export default InscriptionRequestView;
