import { useState, useEffect } from "react";
import { useParams } from "react-router";
import InscriptionLargeView from "../components/inscription/LargeView";
import InscriptionStatus from "../components/inscription/Status";
import InscriptionProperty from "../components/inscription/Property";
import { getInscriptionRequest } from "../api/inscriptions";
import copy from "../../public/icons/copy.png";

function Request(props: any) {
  // TODO: Like, share, and save buttons support
  //        <div className="flex flex-row mx-2 mr-8 px-2 h-12 items-center justify-between">
  //          <div className="flex flex-row h-full items-center justify-center gap-2">
  //            <button className="button__circle--gradient button__circle w-fit flex flex-col justify-center items-center">
  //              <img className="h-6" src="https://static-00.iconduck.com/assets.00/share-ios-fill-icon-1610x2048-1l65jt3c.png" alt="Share"/>
  //            </button>
  //            <button className="button__circle--gradient button__circle w-fit flex flex-col justify-center items-center">
  //              <img className="h-6" src="https://www.iconpacks.net/icons/2/free-heart-icon-3510-thumb.png" alt="Like"/>
  //            </button>
  //            <button className="button__circle--gradient button__circle w-fit flex flex-col justify-center items-center">
  //              <img className="h-6" src="https://icons.iconarchive.com/icons/colebemis/feather/256/bookmark-icon.png" alt="Bookmark"/>
  //            </button>
  //          </div>
  //        </div>

  // TODO: Implement unique request features: ie cancel, accept, reject, bid, other info, ...
  const { id } = useParams<{ id: string }>();

  const [inscription, setInscription] = useState<any>();
  useEffect(() => {
    const fetchRequest = async () => {
      const result = await getInscriptionRequest(id as string);
      if (result && result.data) {
        setInscription(result.data);
      }
    }

    try {
      fetchRequest();
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  const [requesterFormatted, setRequesterFormatted] = useState<string>("");
  useEffect(() => {
    if (inscription) {
      const requester = inscription.requester;
      if (requester) {
        const formatted = `0x${requester.slice(0, 6)}...${requester.slice(-4)}`;
        setRequesterFormatted(formatted);
      }
    }
  }, [inscription]);
  const [recipientFormatted, setRecipientFormatted] = useState<string>("");
  useEffect(() => {
    if (inscription) {
      const recipient = inscription.bitcoin_address;
      if (recipient) {
        const formatted = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
        setRecipientFormatted(formatted);
      }
    }
  }, [inscription]);

  // Websocket messages
  useEffect(() => {
    if (props.requestedInscription) {
      // TODO: Reload inscription if it's the same as the pg id
    }
  }, [props.requestedInscription]);
  useEffect(() => {
    if (props.updateRequest) {
      // TODO: Update requests status
    }
  }, [props.updateRequest]);

  // TODO: Move inscription query up to parent component
  // TODO: Links on owner, block#, id, ...
  return (
    <div className="flex flex-row w-full h-full">
    {inscription === undefined ? (
      <div className="flex flex-row w-full items-center py-2 bg__color--primary h-full border-t-2 border-[var(--color-primary-light)]">
        <div className="flex flex-row w-full h-full items-center justify-center">
          <h1 className="text-4xl font-bold text__color--primary">Loading Request {id}...</h1>
        </div>
      </div>
    ) : (
      <div className="flex flex-col w-full items-center justify-center py-2 bg__color--primary h-fit lg:h-full border-t-2 border-[var(--color-primary-light)]">
        <div className="flex flex-col w-full h-[70%] items-center justify-start lg:flex-row lg:items-start lg:justify-center">
          <div className="flex flex-row h-full items-center justify-center p-4">
            <InscriptionLargeView inscription={inscription} />
          </div>
          <div className="flex flex-col py-8 p-4 justify-center w-full">
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
            <div className="flex flex-row w-full h-full items-center justify-between pr-[10%]">
              <h3 className="text-2xl font-bold underline">Request</h3>
              {inscription.status === 0 || inscription.status === "0" && (
                <button className="button__circle--gradient button__circle w-fit flex flex-col justify-center items-center" onClick={() => props.cancelInscriptionCall(inscription.inscription_id)}>
                  <img className="h-6" alt="Cancel" src="https://img.icons8.com/?size=100&id=63688&format=png&color=000000" />
                </button>
              )}
            </div>
            <div className="pb-12 w-auto">
              <InscriptionStatus status={Number(inscription.status)} />
            </div>
            <h3 className="text-2xl font-bold underline">Info</h3>
            <div className="flex flex-col m-2 mr-8 px-2 py-2 bg__color--tertiary-dull border-2 border-[var(--color-primary-light)] rounded-lg">
              <div className="flex flex-row w-full h-12 items-center border-b-2 border-[var(--color-primary-light)] px-2">
                <h4 className="text-lg font-bold text__color--primary border-r-2 border-[var(--color-primary-light)] w-[5rem] pr-2 mr-2">From</h4>
                <div className="flex flex-row">
                  <p className="text-lg text__color--primary">{requesterFormatted}</p>
                  <img className="h-[1.5rem] ml-2 cursor-pointer" src={copy} alt="Copy"
                    onClick={() => navigator.clipboard.writeText(inscription.requester)} />
                </div>
              </div>
              <div className="flex flex-row w-full h-12 items-center border-b-2 border-[var(--color-primary-light)] px-2">
                <h4 className="text-lg font-bold text__color--primary border-r-2 border-[var(--color-primary-light)] w-[5rem] pr-2 mr-2">To</h4>
                <div className="flex flex-row">
                  <p className="text-lg text__color--primary">{recipientFormatted}</p>
                  <img className="h-[1.5rem] ml-2 cursor-pointer" src={copy} alt="Copy"
                    onClick={() => navigator.clipboard.writeText(inscription.bitcoin_address)} />
                </div>
              </div>
              <div className="flex flex-row w-full h-12 items-center border-b-2 border-[var(--color-primary-light)] px-2">
                <h4 className="text-lg font-bold text__color--primary border-r-2 border-[var(--color-primary-light)] w-[5rem] pr-2 mr-2">Fee</h4>
                <p className="text-lg text__color--primary">{inscription.fee_amount} {inscription.fee_token}</p>
              </div>
              <div className="flex flex-row w-full h-12 items-center px-2">
                <h4 className="text-lg font-bold text__color--primary border-r-2 border-[var(--color-primary-light)] w-[5rem] pr-2 mr-2">ID</h4>
                <p className="text-lg text__color--primary">{inscription.inscription_id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default Request;
