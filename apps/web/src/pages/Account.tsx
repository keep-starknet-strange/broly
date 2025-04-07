import { useState, useEffect } from "react";
import { NavLink } from "react-router";
import InscriptionView from "../components/inscription/View";
import InscriptionRequestView from "../components/inscription/RequestView";
import { getNewInscriptions, getMyOpenInscriptionRequests, getMyInscriptions } from "../api/inscriptions";
import { Pagination } from "../components/Pagination";
import "../components/inscription/View.css";
import { useAccount } from "@starknet-react/core";

function Account(props: any) {
  const { address } = useAccount();
  const [shortAddress, setShortAddress] = useState("");
  useEffect(() => {
    if (address) {
      setShortAddress(address.slice(0, 6) + "..." + address.slice(-4));
    }
  }, [address]);
  /*
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const bitcoinConnectionsTypes = ["Wallet", "Manual"];
  const [bitcoinConnectionType, setBitcoinConnectionType] = useState(bitcoinConnectionsTypes[0]);
  const [bitcoinAddress, setBitcoinAddress] = useState("");
  const [bitcoinAddressInput, setBitcoinAddressInput] = useState("");
  const [shortBitcoinAddress, setShortBitcoinAddress] = useState("");
  useEffect(() => {
    if (bitcoinAddress) {
      setShortBitcoinAddress(bitcoinAddress.slice(0, 6) + "..." + bitcoinAddress.slice(-4));
    }
  }, [bitcoinAddress]);
  */
  useEffect(() => {
    if (address) {
      // TODO: Query username from address
    }
  }, [address]);

  const filters: any[] = [];
  //const filters = ["Collection", "Liked", "Saved"];
  const [activeFilter, setActiveFilter] = useState(filters[0]);

  const defaultInscriptions: any[] = [];
  const [inscriptions, setInscriptions] = useState(defaultInscriptions);
  const [inscriptionsPagination, setInscriptionsPagination] = useState({
    pageLength: 20,
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
      // TODO: getMyXXX
      if (activeFilter === "Hot") {
        result = await getNewInscriptions(inscriptionsPagination.pageLength, inscriptionsPagination.page);
      } else if (activeFilter === "New") {
        result = await getNewInscriptions(inscriptionsPagination.pageLength, inscriptionsPagination.page);
      } else if (activeFilter === "Rare") {
        console.log("TODO: get rare inscriptions");
      } else {
        result = await getMyInscriptions(address.slice(2), inscriptionsPagination.pageLength, inscriptionsPagination.page);
      }
      if (result && result.data) {
        if (inscriptionsPagination.page === 1) {
          setInscriptions(result.data);
        } else {
          const newInscriptios = result.data.filter((inscription: any) => {
            return !inscriptions.some((i: any) => i.inscription_id === inscription.inscription_id);
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
      pageLength: 20,
      page: 1
    });
  }

  useEffect(() => {
    resetPagination();
  }, [activeFilter]);

  useEffect(() => {
    const fetchRequests = async () => {
      const result = await getMyOpenInscriptionRequests(address.slice(2), requestPagination.pageLength, requestPagination.page);
      if (result && result.data) {
        if (requestPagination.page === 1) {
          setRequests(result.data);
        } else {
          const newRequests = result.data.filter((request: any) => {
            return !requests.some((r: any) => r.inscription_id === request.inscription_id);
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

  // Websocket messages
  useEffect(() => {
    if (props.requestedInscription) {
      // TODO: Update open requests
    }
  }, [props.requestedInscription]);
  useEffect(() => {
    if (props.newInscription) {
      // TODO: Update inscriptions lists ( new )
    }
  }, [props.newInscription]);
  useEffect(() => {
    if (props.updateRequest) {
      // TODO: Remove request from open inscriptions or update status
    }
  }, [props.updateRequest]);

  const [randomUserImage, setRandomUserImage] = useState("");
  useEffect(() => {
    if (!address) return;
    const randomSeed = address.slice(2);
    const canvas = document.createElement("canvas");
    const width = 10;
    const height = 10;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context) {
      const imageData = context.createImageData(width, height);
      for (let i = 0; i < width * height; i++) {
        const seededValueR = parseInt(randomSeed[(4*i) % randomSeed.length], 16);
        const seededValueG = parseInt(randomSeed[(3*i+1) % randomSeed.length], 16);
        const seededValueB = parseInt(randomSeed[(2*i+2) % randomSeed.length], 16);
        imageData.data[i * 4] = seededValueR * 16;
        imageData.data[i * 4 + 1] = seededValueG * 16;
        imageData.data[i * 4 + 2] = seededValueB * 16;
        imageData.data[i * 4 + 3] = 255;
      }
      context.putImageData(imageData, 0, 0);
      setRandomUserImage(canvas.toDataURL());
    }
  }, [address]);

  // TODO: Button to create new request if no requests are open
  // TODO: shadow and arrow on rhs of scrollable div
  // TODO: Username support
  //        {(username && username.length > 0) ? (
  //          <div className="flex flex-row items-center gap-4 ml-4 h-10">
  //            <h1 className="text-xl font-bold">{username}</h1>
  //            <button className="button__none" onClick={() => setUsername("")}>
  //              <img src="/icons/edit2.png" alt="verified" className="w-4 h-4" />
  //            </button>
  //          </div>
  //        ) : (
  //          <div className="flex flex-row items-center gap-2">
  //            <input
  //              type="text"
  //              placeholder="Username"
  //              className="input__primary flex-grow"
  //              value={usernameInput}
  //              onChange={(e) => setUsernameInput(e.target.value)}
  //            />
  //            <button className="button__none" onClick={() => setUsername(usernameInput)}>
  //              <img src="/icons/check.png" alt="save" className="w-6 h-6" />
  //            </button>
  //          </div>
  //        )}
  // TODO: Bitcoin address link support
  //      {(bitcoinAddress && bitcoinAddress.length > 0) ? (
  //        <div className="flex flex-row items-center gap-4 h-10">
  //          <img src="/icons/bitcoin.webp" alt="Bitcoin" className="w-8 h-8 ml-4" />
  //          <p className="text-md font-bold">{shortBitcoinAddress}</p>
  //          <button className="button__none" onClick={() => setBitcoinAddress("")}>
  //            <img src="/icons/edit2.png" alt="verified" className="w-4 h-4" />
  //          </button>
  //        </div>
  //      ) : (
  //        <div className="flex flex-row gap-2 items-center">
  //          <img src="/icons/bitcoin.webp" alt="Bitcoin" className="w-8 h-8 ml-4" />
  //          <div className="flex flex-col gap-2 flex-grow">
  //            <div className="flex flex-row items-center gap-2 bg-[var(--color-primary-o5)] rounded-[1.5rem] p-1">
  //              {bitcoinConnectionsTypes.map((type) => (
  //                <button
  //                  key={type}
  //                  className={`w-full h-8 ${bitcoinConnectionType === type ? "Form__selection--selected" : "Form__selection"}`}
  //                  onClick={() => setBitcoinConnectionType(type)}
  //                >
  //                  {type}
  //                </button>
  //              ))}
  //            </div>
  //            {bitcoinConnectionType === "Wallet" && (
  //              <div className="flex flex-row items-center justify-center gap-2 w-full h-8">
  //                <button className="buttonlike__primary buttonlike__primary--gradient text-center">
  //                  Link Xverse
  //                </button>
  //              </div>
  //            )}
  //            {bitcoinConnectionType === "Manual" && (
  //              <div className="flex flex-row items-center gap-2 h-8">
  //                <input
  //                  type="text"
  //                  placeholder="Bitcoin Address"
  //                  className="input__primary flex-grow"
  //                  value={bitcoinAddressInput}
  //                  onChange={(e) => setBitcoinAddressInput(e.target.value)}
  //                  onKeyPress={(e) => {
  //                    if (e.key === "Enter") {
  //                      setBitcoinAddress(bitcoinAddressInput);
  //                    }
  //                  }
  //                }
  //                />
  //              </div>
  //            )}
  //          </div>
  //        </div>
  //      )}
  return (
    <div className="w-full flex flex-col h-max">
      <div className="bg__color--tertiary w-full flex flex-row p-4">
        <div className="flex flex-col w-[12rem] bg-[var(--color-primary)] rounded-lg border-2 border-[var(--color-primary)]">
          <div className="relative">
            <img
              src={randomUserImage}
              alt="Profile"
              className="w-[12rem] h-[12rem] p-2 z-10 pixelimg"
            />
            <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 rounded-lg opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200 z-12">
              <img src="/icons/edit.png" alt="edit" className="absolute top-[50%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] w-12 h-12 z-13" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-2 w-[20rem] relative">
          <div className="flex flex-row items-center gap-4 ml-4">
            <img src="/icons/starknet.webp" alt="Starknet" className="w-8 h-8" />
            <p className="text-md font-bold flex-1">{shortAddress}</p>
          </div>
        </div>
      </div>
      {requests && requests.length > 0 && (
        <div className="bg__color--tertiary w-full flex flex-col items-center justify-center py-4">
          <h1 className="text-2xl sm:text-4xl font-bold">Open Inscription Requests</h1>
          <div className="w-full flex flex-row items-center overflow-x-scroll py-6 gap-6 px-6">
            {requests.map((request, index) => {
              return (
                <div className="z-[10]" key={index}>
                  <InscriptionRequestView key={request.inscription_id} inscription={request} />
                </div>
              );
            })}
            <NavLink to="/" className="z-[10] button--gradient button__circle flex flex-col items-center justify-center">
              <p className="text-3xl font-bold w-[3rem] h-[3rem] text-center">+</p>
            </NavLink>
          </div>
        </div>
      )}
      <div className="w-full flex flex-col items-center py-2 bg__color--primary h-full border-t-2 border-[var(--color-primary-light)]">
        <div className="w-full flex flex-row items-center justify-between">
          <h1 className="text-md sm:text-xl font-bold px-2 sm:px-4">Inscriptions</h1>
          <div className="flex flex-row items-center mr-2 sm:mr-6 gap-1 sm:gap-3 md:gap-4">
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
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4 py-4 sm:py-8">
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

export default Account;
