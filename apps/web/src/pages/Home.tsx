import { useState, useEffect } from "react";
import { NavLink } from "react-router";
import InscriptionView from "../components/inscription/View";
import InscriptionForm from "../components/inscription/Form";
import InscriptionStatus from "../components/inscription/Status";
import { Pagination } from "../components/Pagination";
import { getNewInscriptions } from "../api/inscriptions";

function Home(props: any) {
  const [isInscribing, setIsInscribing] = useState(false);
  const [inscribingStatus, setInscribingStatus] = useState(-2);

  const defaultInscription: any[] = [];
  const [recentInscriptions, setRecentInscriptions] = useState(defaultInscription);
  const [recentsPagination, setRecentsPagination] = useState({
    pageLength: 20,
    page: 1,
  });

  useEffect(() => {
    const fetchInscriptions = async () => {
      // TODO fetch real new inscriptions from smart contract
      const result = await getNewInscriptions(recentsPagination.pageLength, recentsPagination.page);
      if (result.data) {
        if (recentsPagination.page === 1) {
          setRecentInscriptions(result.data);
        } else {
          const newInscriptions = result.data.filter((inscription: any) => {
            return !recentInscriptions.some((recent: any) => recent.inscription_id === inscription.inscription_id);
          });
          setRecentInscriptions([...recentInscriptions, ...newInscriptions]);
        }
      }
    };
    try {
      fetchInscriptions();
    } catch (error) {
      console.error(error);
    }
  }, [recentsPagination, isInscribing]);

  // Websocket messages
  const [requestId, setRequestId] = useState(null);
  useEffect(() => {
    if (props.requestedInscription) {
      setRequestId(props.requestedInscription.inscription_id.toString());
      setInscribingStatus(props.requestedInscription.status);
    }
  }, [props.requestedInscription]);
  useEffect(() => {
    if (props.newInscription) {
      let newRecentInscriptions = recentInscriptions.filter((inscription) => {
        return inscription.inscription_id !== props.newInscription.inscription_id;
      });
      if (newRecentInscriptions.length % recentsPagination.pageLength === 0) {
        newRecentInscriptions = [props.newInscription, ...newRecentInscriptions.slice(0, recentsPagination.pageLength - 1)];
      } else {
        newRecentInscriptions = [props.newInscription, ...newRecentInscriptions];
      }
      setRecentInscriptions(newRecentInscriptions);
    }
  }, [props.newInscription]);
  useEffect(() => {
    if (props.updateRequest && props.updateRequest.id === requestId) {
      setInscribingStatus(props.updateRequest.status);
    }
  }, [props.updateRequest]);

  return (
    <div className="w-full flex flex-col h-max">
      <div className="bg__color--tertiary w-full flex flex-col items-center justify-center pt-8 pb-10">
        <h1 className="text-4xl font-bold">Inscribe on Bitcoin</h1>
        <h2 className="text-lg mb-8">Starknet's Decentralized Inscriptor Network</h2>
        <InscriptionForm
          isInscribing={isInscribing}
          setIsInscribing={setIsInscribing}
          requestInscriptionCall={props.requestInscriptionCall}
          taprootAddress={props.taprootAddress}
          isStarknetConnected={props.isStarknetConnected}
        />
        {isInscribing && <InscriptionStatus status={inscribingStatus} />}
      </div>
      <div className="w-full flex flex-col items-center py-2 bg__color--primary h-full border-t-2 border-[var(--color-primary-light)]">
        <div className="w-full flex flex-row items-center justify-between">
          <h1 className="text-xl font-bold px-4">Recent Inscriptions</h1>
          <NavLink to="/inscriptions" className="flex flex-row items-center">
            <p className="text-sm font-bold px-4 tab__nav text-xl">Explore &rarr;</p>
          </NavLink>
        </div>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4 py-8">
          {recentInscriptions.map((inscription, index) => (
            <InscriptionView key={index} inscription={inscription} />
          ))}
        </div>
        <Pagination
          data={recentInscriptions}
          setState={setRecentsPagination}
          stateValue={recentsPagination}
        />
      </div>
    </div>
  );
}

export default Home;
