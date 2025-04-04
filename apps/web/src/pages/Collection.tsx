import { useState, useEffect } from "react";
import { NavLink } from "react-router";
import InscriptionView from "../components/inscription/View";
import InscriptionRequestView from "../components/inscription/RequestView";
import { mockAddress } from "../api/mock";
import { getMyNewInscriptions, getMyTopInscriptions, getMyInscriptionRequests } from "../api/inscriptions";
import { Pagination } from "../components/Pagination";

function Collection(props: any) {
  const filters = ["New", "Top", "Rare", "Requests"];
  const [activeFilter, setActiveFilter] = useState(filters[0]);

  const defaultInscriptions: any[] = [];
  const [collection, setCollection] = useState(defaultInscriptions);
  const [collectionPagination, setCollectionPagination] = useState({
    pageLength: 20,
    page: 1
  });
  const defaultRequests: any[] = [];
  const [myRequests, setMyRequests] = useState(defaultRequests);

  useEffect(() => {
    const fetchCollection = async () => {
      let result;
      if (activeFilter === "New") {
        result = await getMyNewInscriptions(mockAddress, collectionPagination.pageLength, collectionPagination.page);
      } else if (activeFilter === "Top") {
        result = await getMyTopInscriptions(mockAddress, collectionPagination.pageLength, collectionPagination.page);
      } else if (activeFilter === "Rare") {
        console.log("TODO: Get rare inscriptions");
      } else if (activeFilter === "Requests") {
        result = await getMyInscriptionRequests(mockAddress, collectionPagination.pageLength, collectionPagination.page);
        if (collectionPagination.page === 1) {
          if (result.data && result.data.length > 0) setMyRequests(result.data);
        } else {
          const newRequests = result.data.filter((inscription: any) => !myRequests.find((existingInscription: any) => existingInscription.inscription_id === inscription.inscription_id));
          setMyRequests([...myRequests, ...newRequests]);
        }
        return;
      }
      if (result && result.data) {
        if (collectionPagination.page === 1) {
          setCollection(result.data);
        } else {
          const newCollection = result.data.filter((inscription: any) => !collection.find((existingInscription: any) => existingInscription.inscription_id === inscription.inscription_id));
          setCollection([...collection, ...newCollection]);
        }
      }
    }
    try {
      fetchCollection();
    } catch (error) {
      console.error(error);
    }
  }, [collectionPagination]);

  const resetPagination = () => {
    setCollectionPagination({
      pageLength: 16,
      page: 1
    });
  }

  useEffect(() => {
    resetPagination();
  }, [activeFilter]);

  // Websocket messages
  useEffect(() => {
    if (props.requestedInscription) {
      // TODO: Update requests if owned inscription is requested
    }
  }, [props.requestedInscription]);
  useEffect(() => {
    if (props.newInscription) {
      // TODO: Add new inscription to collection if owned
    }
  }, [props.newInscription]);
  useEffect(() => {
    if (props.updateRequest) {
      // TODO: Remove request or update status if on requests page
    }
  }, [props.updateRequest]);

  // TODO: Button to create new request if no requests are open
  // TODO: Button to view requests if requests are open
  // <input type="text" placeholder="Search..." className="input__search w-40 sm:w-64 mr-1 relative"/>
  return (
    <div className="w-full flex flex-col h-max bg__color--primary border-t-2 border-[var(--color-primary-light)]">
      <div className="w-full flex flex-row items-center justify-between py-2">
        <h1 className="text-lg sm:text-xl font-bold px-2 sm:px-4">My Collection</h1>
        <div className="flex flex-row items-center mr-2 sm:mr-6 gap-1 sm:gap-3 md:gap-4">
          {filters.map((filter) => (
            <button key={filter} className={`button__secondary w-fit w-16 text-center ${activeFilter === filter ? "button__secondary--active" : "button__secondary--gradient"}`} onClick={() => setActiveFilter(filter)}>{filter}</button>
          ))}
        </div>
      </div>
      <div className="w-full flex flex-col items-center">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4 py-4 sm:py-8">
          {activeFilter === "Requests" ? myRequests.map((inscription) => (
            <InscriptionRequestView key={inscription.inscription_id} inscription={inscription} />
          )) : collection.map((inscription) => (
            <InscriptionView key={inscription.inscription_id} inscription={inscription} />
          ))}
        </div>
        <div className="w-full flex flex-row items-center justify-center gap-4 mb-4">
          {activeFilter === "Requests" && (
            <NavLink to="/" className="button--gradient button__primary flex flex-col items-center justify-center">
              <p className="text-center">Create</p>
            </NavLink>
          )}
          <Pagination
            data={collection}
            setState={setCollectionPagination}
            stateValue={collectionPagination}
          />
        </div>
      </div>
    </div>
  );
}
// TODO: Search icon

export default Collection;
