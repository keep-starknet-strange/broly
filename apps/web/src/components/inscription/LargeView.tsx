import InscriptionTextLargeView from "./TextLargeView";
import InscriptionImageLargeView from "./ImageLargeView";
import "./View.css";

function InscriptionLargeView(props: any) {
  return (
    <div className="LargeView__container">
      {props.inscription.type === "text" ? (
        <InscriptionTextLargeView inscription={props.inscription} />
      ) : (
        <InscriptionImageLargeView inscription={props.inscription} />
      )}
    </div>
  );
}

export default InscriptionLargeView;
