import { useState, useEffect } from "react";
import { useParams } from "react-router";
import InscriptionLargeView from "../components/inscription/LargeView";
import InscriptionProperty from "../components/inscription/Property";
import { getInscription } from "../api/inscriptions";

function Inscription(_props: any) {
  const { id } = useParams<{ id: any }>();

  const [inscription, setInscription] = useState<any>();
  useEffect(() => {
    const fetchInscription = async () => {
      const result = await getInscription(id);
      if (result && result.data) {
        setInscription(result.data);
      }
    }
    try {
      fetchInscription();
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  const [ownerFormatted, setOwnerFormatted] = useState<string>("");
  useEffect(() => {
    if (inscription) {
      const owner = inscription.owner;
      if (owner) {
        const formatted = `0x${owner.slice(0, 6)}...${owner.slice(-4)}`;
        setOwnerFormatted(formatted);
      }
    }
  }, [inscription]);

  // TODO: Move inscription query up to parent component
  // TODO: Links on owner, block#, id, ...
  return (
    <div className="flex flex-row w-full h-full">
    {inscription === undefined ? (
      <div className="flex flex-row w-full items-center py-2 bg__color--primary h-full border-t-2 border-[var(--color-primary-light)]">
        <div className="flex flex-row w-full h-full items-center justify-center">
          <h1 className="text-4xl font-bold text__color--primary">Loading Inscription {id}...</h1>
        </div>
      </div>
    ) : (
      <div className="flex flex-col w-full items-center justify-center py-2 bg__color--primary h-fit lg:h-full border-t-2 border-[var(--color-primary-light)]">
        <div className="flex flex-col w-full h-[70%] items-center justify-start lg:flex-row lg:items-start lg:justify-center">
          <div className="flex flex-row h-full items-center justify-center p-4">
            <InscriptionLargeView inscription={inscription} />
          </div>
          <div className="flex flex-col py-8 p-4 justify-center">
            {inscription.properties && inscription.properties.length > 0 && (
              <div className="flex flex-col w-full h-full mb-6">
                <h3 className="text-2xl font-bold underline">Properties</h3>
                <div className="flex flex-row flex-wrap mx-4 my-2 gap-2">
                  {inscription.properties.map((property: any) => (
                    <InscriptionProperty name={property.name} value={property.value} key={property.name} />
                  ))}
                </div>
              </div>
            )}
            <h3 className="text-2xl font-bold underline">Info</h3>
            <div className="flex flex-col m-2 mr-8 px-2 py-2 bg__color--tertiary-dull border-2 border-[var(--color-primary-light)] rounded-lg">
              <div className="flex flex-row w-full h-12 items-center border-b-2 border-[var(--color-primary-light)] px-2">
                <h4 className="text-lg font-bold text__color--primary border-r-2 border-[var(--color-primary-light)] w-[5rem] pr-2 mr-2">Owner</h4>
                <p className="text-lg text__color--primary">{ownerFormatted}</p>
                <img className="h-6 ml-2 hover:cursor-pointer hover:scale-110 transition-transform duration-200 ease-in-out active:scale-100 active:transform-none" src="https://img.icons8.com/?size=100&id=30&format=png&color=000000" alt="Copy" onClick={() => navigator.clipboard.writeText(`0x${inscription.owner}`)} />
              </div>
              <div className="flex flex-row w-full h-12 items-center border-b-2 border-[var(--color-primary-light)] px-2">
                <h4 className="text-lg font-bold text__color--primary border-r-2 border-[var(--color-primary-light)] w-[5rem] pr-2 mr-2">Sat #</h4>
                <p className="text-lg text__color--primary">{inscription.sat_number}</p>
              </div>
              <div className="flex flex-row w-full h-12 items-center border-b-2 border-[var(--color-primary-light)] px-2">
                <h4 className="text-lg font-bold text__color--primary border-r-2 border-[var(--color-primary-light)] w-[5rem] pr-2 mr-2">Minted</h4>
                <p className="text-lg text__color--primary mr-4">{inscription.minted_block}</p>
                <p className="text-sm text__color--primary">{inscription.minted.toString()}</p>
              </div>
              <div className="flex flex-row w-full h-12 items-center px-2">
                <h4 className="text-lg font-bold text__color--primary border-r-2 border-[var(--color-primary-light)] w-[5rem] pr-2 mr-2">ID</h4>
                <p className="text-lg text__color--primary">{inscription.inscription_id}</p>
              </div>
            </div>
            <div className="flex flex-row mx-2 mr-8 px-2 h-12 items-center justify-between">
              <button className="button--gradient button__primary w-fit">Ordiscan</button>
              <div className="flex flex-row h-full items-center justify-center gap-2">
                <button className="button__circle--gradient button__circle w-fit flex flex-col justify-center items-center">
                  <img className="h-6" src="https://static-00.iconduck.com/assets.00/share-ios-fill-icon-1610x2048-1l65jt3c.png" alt="Share"/>
                </button>
                <button className="button__circle--gradient button__circle w-fit flex flex-col justify-center items-center">
                  <img className="h-6" src="https://www.iconpacks.net/icons/2/free-heart-icon-3510-thumb.png" alt="Like"/>
                </button>
                <button className="button__circle--gradient button__circle w-fit flex flex-col justify-center items-center">
                  <img className="h-6" src="https://icons.iconarchive.com/icons/colebemis/feather/256/bookmark-icon.png" alt="Bookmark"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default Inscription;
