import { NavLink } from "react-router";
import "./Header.css";

function Header(props: any) {
  return (
    <header className="text-center flex flex-row justify-between items-center px-4 py-1 m-0 bg-slate-900">
      <div className="flex flex-row items-center">
        <NavLink to={props.tabs[0].path} className="flex flex-row items-center">
          <img src="/images/logo.png" alt="B.R.O.L.Y. Logo" className="w-10 h-10" />
          <h1 className="text-4xl font-bold pl-2">B.R.O.L.Y.</h1>
        </NavLink>
        <h2 className="text-lg font-light pl-6">Bitcoin Registry Orchestrates Like Yesterday</h2>
      </div>
      <nav className="flex justify-center flex-row items-center">
        {props.tabs.slice(1).map((tab: any, index: number) => (
          <NavLink key={index} to={tab.path} className="tab__nav">
            {tab.name}
          </NavLink>
        ))}
        <button className="button__primary">Login</button>
      </nav>
    </header>
  );
}

export default Header;
