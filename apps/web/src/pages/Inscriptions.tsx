import { useState, useEffect } from "react";
import { NavLink } from "react-router";
import InscriptionView from "../components/inscription/View";
import InscriptionRequestView from "../components/inscription/RequestView";
import { getHotInscriptions, getNewInscriptions, getOpenInscriptionRequests } from "../api/inscriptions";
import { Pagination } from "../components/Pagination";

function Inscritpions(_props: any) {
  const filters = ["Hot", "New", "Rare"];
  const [activeFilter, setActiveFilter] = useState(filters[0]);

  const defaultInscriptions: any[] = [];
  const [inscriptions, setInscriptions] = useState(defaultInscriptions);
  const [inscriptionsPagination, setInscriptionsPagination] = useState({
    pageLength: 16,
    page: 1
  });
  const defaultRequests: any[] = [];
  const [requests, setRequests] = useState(defaultRequests);
  // TODO: Pagination for requests
  const [requestPagination, _] = useState({
    pageLength: 10,
    page: 1
  });

  useEffect(() => {
    const fetchInscriptions = async () => {
      let result;
      if (activeFilter === "Hot") {
        result = await getNewInscriptions(inscriptionsPagination.pageLength, inscriptionsPagination.page);
        // TODO: result = await getHotInscriptions(inscriptionsPagination.pageLength, inscriptionsPagination.page);
      } else if (activeFilter === "New") {
        result = await getNewInscriptions(inscriptionsPagination.pageLength, inscriptionsPagination.page);
      } else if (activeFilter === "Rare") {
        console.log("TODO: get rare inscriptions");
      }
      if (result && result.data) {
        if (inscriptionsPagination.page === 1) {
          setInscriptions(result.data);
        } else {
          let newInscriptios = result.data.filter((inscription: any) => {
            return !inscriptions.some((i: any) => i.id === inscription.id);
          });
          setInscriptions([...inscriptions, ...newInscriptios]);
        }
      }
    }
    try {
      fetchInscriptions();
    } catch (error) {
      console.log("Error fetching inscriptions", error);
    }
  }, [inscriptionsPagination]);

  const resetPagination = () => {
    setInscriptionsPagination({
      pageLength: 16,
      page: 1
    });
  }

  useEffect(() => {
    resetPagination();
  }, [activeFilter]);

  useEffect(() => {
    const fetchRequests = async () => {
      let result = await getOpenInscriptionRequests(requestPagination.pageLength, requestPagination.page);
      if (result && result.data) {
        if (requestPagination.page === 1) {
          setRequests(result.data);
        } else {
          let newRequests = result.data.filter((request: any) => {
            return !requests.some((r: any) => r.id === request.id);
          });
          setRequests([...requests, ...newRequests]);
        }
      }
    }
    try {
      fetchRequests();
    } catch (error) {
      console.log("Error fetching requests", error);
    }
  }, [requestPagination]);

  // TODO: Button to create new request if no requests are open
  // TODO: shadow and arrow on rhs of scrollable div
  return (
    <div className="w-full flex flex-col h-max">
      {requests && requests.length > 0 && (
        <div className="bg__color--tertiary w-full flex flex-col items-center justify-center py-4">
          <h1 className="text-2xl sm:text-4xl font-bold">Open Inscription Requests</h1>
          <div className="w-full flex flex-row items-center overflow-x-scroll py-6 gap-6 px-6">
            {requests.map((request, index) => {
              return (
                <div className="" key={index}>
                  <InscriptionRequestView key={request.id} inscription={request} />
                </div>
              );
            })}
            <NavLink to="/" className="button--gradient button__circle flex flex-col items-center justify-center">
              <p className="text-3xl font-bold w-[3rem] h-[3rem] text-center">+</p>
            </NavLink>
          </div>
        </div>
      )}
      <div className="w-full flex flex-col items-center py-2 bg__color--primary h-full border-t-2 border-[var(--color-primary-light)]">
        <div className="w-full flex flex-row items-center justify-between">
          <h1 className="text-md sm:text-xl font-bold px-2 sm:px-4">All Inscriptions</h1>
          <div className="flex flex-row items-center mr-2 sm:mr-6 gap-1 sm:gap-3 md:gap-4">
            <input type="text" placeholder="Search..." className="input__search w-40 sm:w-64 mr-1 relative"/>
            {filters.map((filter) => (
              <button
                key={filter}
                className={`button__secondary w-fit text-center ${
                  activeFilter === filter ? "button__secondary--active" : "button__secondary--gradient"
                }`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 px-4 py-4 sm:py-8">
          {inscriptions.map((inscription, index) => (
            <InscriptionView key={index} inscription={inscription} />
          ))}
        </div>
        <Pagination
          data={inscriptions}
          setState={setInscriptionsPagination}
          stateValue={inscriptionsPagination}
        />
      </div>
    </div>
  );
}
// TODO: Search icon

export default Inscritpions;
