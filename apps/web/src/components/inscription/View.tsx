import { NavLink } from "react-router";
import InscriptionTextView from "./TextView";
import InscriptionImageView from "./ImageView";
import "./View.css";

function InscriptionView(props: any) {
  return (
    <div className="View__container">
      <NavLink to={`/inscription/${props.inscription.inscription_id}`}>
        {props.inscription.type === "text" ? (
          <InscriptionTextView inscription={props.inscription} />
        ) : (
          <InscriptionImageView inscription={props.inscription} />
        )}
      </NavLink>
    </div>
  );
}

export default InscriptionView;
