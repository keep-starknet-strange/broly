import { NavLink } from "react-router";
import InscriptionTextView from "./TextView";
import InscriptionImageView from "./ImageView";
import "./View.css";

function InscriptionView(props: any) {
  return (
    <div className="View__container">
      <NavLink to={`/inscription/${props.inscription.id}`}>
        {props.inscription.type === "text" ? (
          <InscriptionTextView content={props.inscription.content} />
        ) : (
          <InscriptionImageView content={props.inscription.content} />
        )}
      </NavLink>
    </div>
  );
}

export default InscriptionView;
