import { useState, useEffect } from "react";
import "./Property.css";

function InscriptionProperty(props: any) {
  const [bgScheme, setBgScheme] = useState("Property__bg--default");
  const [borderScheme, setBorderScheme] = useState("border-[var(--color-secondary-dark)]");
  const schemeCount = 6;
  // TODO: Change the color scheme based on the property id?
  useEffect(() => {
    if (!props.name) {
      setBgScheme("Property__bg--default");
      setBorderScheme("border-[var(--color-secondary-dark)]");
      return;
    }
    // Hash the scheme name and value to get a number between 0 and 5
    const hash = props.name
      .split("")
      .map((char: string) => char.charCodeAt(0))
      .reduce((acc: number, curr: number) => acc + curr, 0);
    const schemeIndex = hash % schemeCount;
    setBgScheme(`Property__bg--${schemeIndex}`);
    setBorderScheme(`border-[var(--property-color-${schemeIndex}-border)]`);
  }, [props]);

  return (
    <div className={`flex flex-row h-12 items-center p-2 border-2 ${borderScheme} rounded-lg ${bgScheme}`}>
      <h4 className={`text-lg font-bold border-r-2 ${borderScheme} pr-2 mr-2`}>{props.name}</h4>
      <p className="text-lg text__color--primary">{props.value}</p>
    </div>
  );
}

export default InscriptionProperty;
