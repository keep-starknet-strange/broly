import { NavLink } from "react-router";
import "./Header.css";

function Header(props: any) {
  return (
    <header className="heading__color--primary text-center flex flex-row justify-between items-center px-1 sm:px-3 md:px-4 py-1 m-0 fixed w-full z-10">
      <div className="flex flex-row items-center">
        <NavLink to={props.tabs[0].path} className="flex flex-row items-center">
          <img src="/images/logo.png" alt="B.R.O.L.Y. Logo" className="m-1 sm:m-2 w-10 h-10 sm:w-12 sm:h-12 border-[1px] border-[var(--color-secondary)] rounded-full bg-[#a8c8a808]"/>
          <h1 className="text-2xl sm:text-4xl font-bold sm:pl-1">B.R.O.L.Y.</h1>
        </NavLink>
      </div>
      <nav className="flex justify-center flex-row items-center gap-3 sm:gap-4 md:gap-6">
        {props.tabs.slice(1).map((tab: any, index: number) => (
          <NavLink key={index} to={tab.path} className="tab__nav text-md sm:text-lg md:text-xl">
            {tab.name}
          </NavLink>
        ))}
        {props.isConnected ? (
          <button className="button--gradient button__primary" onClick={props.disconnectWallet}>
            Logout
          </button>
        ) : (
          <button className="button--gradient button__primary" onClick={props.connectWallet}>
            Login
          </button>
        )}
      </nav>
    </header>
  );
}

export default Header;
