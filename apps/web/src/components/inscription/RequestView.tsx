import { NavLink } from "react-router";
import InscriptionTextView from "./TextView";
import InscriptionImageView from "./ImageView";
import "./View.css";

function InscriptionRequestView(props: any) {
  return (
    <div className="View__container">
      <NavLink to={`/request/${props.inscription.inscription_id}`}>
        {props.inscription.type === "text" || props.inscription.type === "unknown" ? (
          <InscriptionTextView inscription={props.inscription} />
        ) : (
          <InscriptionImageView inscription={props.inscription} />
        )}
      </NavLink>
    </div>
  );
}

export default InscriptionRequestView;
