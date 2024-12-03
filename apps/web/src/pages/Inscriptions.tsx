import { useState } from "react";
import { NavLink } from "react-router";
import InscriptionView from "../components/inscription/View";
import InscriptionRequestView from "../components/inscription/RequestView";

function Inscritpions() {
  const openRequests = [
    {
      id: 1,
      content: "Hello, World!",
      type: "text"
    },
    {
      id: 2,
      content: "https://gssc.esa.int/navipedia/images/a/a9/Example.jpg",
      type: "image"
    },
    {
      id: 3,
      content: "https://i.gifer.com/fetch/w300-preview/4b/4b8e74df2974d2ec97065e78b3551841.gif"  ,
      type: "image"
    },
    {
      id: 4,
      content: "Hello, World 2!\nThis is a multiline text.\mThis text is long.\nAnd another lin  e\nAnd another longer line\n...\nHello\nWorld\nLorum\nIpsum\nText\n...\nMore\nLines",
      type: "text"
    },
    {
      id: 5,
      content: "https://gssc.esa.int/navipedia/images/a/a9/Example.jpg",
      type: "image"
    },
    {
      id: 6,
      content: "Hello, World 3!\nThis is a multiline text.\nThis is a multiline text 2.",
      type: "text"
    },
    {
      id: 7,
      content: "https://gssc.esa.int/navipedia/images/a/a9/Example.jpg",
      type: "image"
    },
    {
      id: 8,
      content: "Hello, World 3!\nThis is a multiline text.\nThis is a multiline text 2.",
      type: "text"
    },
    {
      id: 9,
      content: "https://gssc.esa.int/navipedia/images/a/a9/Example.jpg",
      type: "image"
    }
  ];
  const allInscriptions = openRequests.concat(openRequests).splice(0, 12);

  const filters = ["Hot", "New", "Rare"];
  const [activeFilter, setActiveFilter] = useState(filters[0]);

  // TODO: Button to create new request if no requests are open
  // TODO: shadow and arrow on rhs of scrollable div
  return (
    <div className="w-full flex flex-col h-max">
      <div className="bg__color--tertiary w-full flex flex-col items-center justify-center py-4">
        <h1 className="text-4xl font-bold">Open Inscription Requests</h1>
        <div className="w-full flex flex-row items-center overflow-x-scroll py-6 gap-6 px-6">
          {openRequests.map((request) => {
            return (
              <div className="">
                <InscriptionRequestView key={request.id} inscription={request} />
              </div>
            );
          })}
          <NavLink to="/" className="button--gradient button__circle flex flex-col items-center justify-center">
            <p className="text-3xl font-bold w-[3rem] h-[3rem] text-center">+</p>
          </NavLink>
        </div>
      </div>
      <div className="w-full flex flex-col items-center py-2 bg__color--primary h-full border-t-2 border-[var(--color-primary-light)]">
        <div className="w-full flex flex-row items-center justify-between">
          <h1 className="text-xl font-bold px-4">All Inscriptions</h1>
          <div className="flex flex-row items-center mr-6 gap-4">
            <input type="text" placeholder="Search..." className="input__search w-64 mr-4 relative"/>
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
        <div className="w-full grid grid-cols-4 gap-4 px-4 py-8">
          {allInscriptions.map((inscription) => (
            <InscriptionView key={inscription.id} inscription={inscription} />
          ))}
        </div>
        <button className="button--gradient button__primary w-fit mb-4">Load More...</button>
      </div>
    </div>
  );
}
// TODO: Search icon

export default Inscritpions;
