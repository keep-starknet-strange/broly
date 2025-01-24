import { useEffect, useState } from "react";

function InscriptionImageView(props: any) {
  const [image, setImage] = useState<string>("");
  useEffect(() => {
    // 3 different ways of data formatting:
    //   1. image/png;base64,....
    //   2. image:http://localhost:3000/....
    //   3. ...
    if (props.inscription.inscription_data === "") {
      return;
    }

    if (props.inscription.inscription_data.includes("http")) {
      setImage(props.inscription.inscription_data);
      return;
    } else {
      const imageType = props.inscription.inscription_data.split(";")[0].split(":")[1];
      setImage(`data:${imageType};base64,${props.inscription.inscription_data.split(",")[1]}`);
    }
  }, [props.inscription.inscription_data]);

  // TODO: Slide in/out the header instead of just showing/hiding it
  const [isHovering, setIsHovering] = useState<boolean>(false);
  return (
    <div className="relative flex flex-col items-center justify-center h-full" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <h3 className={`absolute top-0 left-0 text-lg View__header h-8 hidden`}>Image</h3>
      <div className="flex flex-row items-center justify-center h-full w-full overflow-hidden">
        <img src={image} alt="inscription" className="object-cover w-full View__pixelated" />
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

export default InscriptionImageView;
