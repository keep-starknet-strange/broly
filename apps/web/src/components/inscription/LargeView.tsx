import InscriptionTextLargeView from "./TextLargeView";
import InscriptionImageLargeView from "./ImageLargeView";
import "./View.css";

function InscriptionLargeView(props: any) {
  return (
    <div className="LargeView__container">
      {props.inscription.type === "text" ? (
        <InscriptionTextLargeView content={props.inscription.content} />
      ) : (
        <InscriptionImageLargeView content={props.inscription.content} />
      )}
    </div>
  );
}

export default InscriptionLargeView;
