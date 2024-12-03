import { NavLink } from "react-router";
import "./Header.css";

function Header(props: any) {
  return (
    <header className="heading__color--primary text-center flex flex-row justify-between items-center px-4 py-1 m-0 fixed w-full z-10">
      <div className="flex flex-row items-center">
        <NavLink to={props.tabs[0].path} className="flex flex-row items-center">
          <img src="/images/logo.png" alt="B.R.O.L.Y. Logo" className="m-2 w-12 h-12 border-[1px] border-[var(--color-secondary)] rounded-full bg-[#a8c8a808]"/>
          <h1 className="text-4xl font-bold pl-1">B.R.O.L.Y.</h1>
        </NavLink>
      </div>
      <nav className="flex justify-center flex-row items-center">
        {props.tabs.slice(1).map((tab: any, index: number) => (
          <NavLink key={index} to={tab.path} className="tab__nav">
            {tab.name}
          </NavLink>
        ))}
        <button className="button--gradient button__primary">Login</button>
      </nav>
    </header>
  );
}

export default Header;
