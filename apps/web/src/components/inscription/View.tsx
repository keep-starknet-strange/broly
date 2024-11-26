import InscriptionTextView from "./TextView";
import InscriptionImageView from "./ImageView";

function InscriptionView(props: any) {
  return (
    <div className="border-2 border-gray-300 rounded-lg p-4">
      {props.inscription.type === "text" ? (
        <InscriptionTextView content={props.inscription.content} />
      ) : (
        <InscriptionImageView content={props.inscription.content} />
      )}
    </div>
  );
}

export default InscriptionView;
