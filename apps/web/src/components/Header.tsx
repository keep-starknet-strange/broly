import { useState, useEffect } from "react";
import { NavLink } from "react-router";
import "./Header.css";
import { useAccount } from "@starknet-react/core";

function Header(props: any) {
  const { tabs, starknetWallet, bitcoinWallet } = props

  const { address } = useAccount();
  const [userShortAddress, setUserShortAddress] = useState("")
  useEffect(() => {
    if (starknetWallet.isConnected && address) {
      setUserShortAddress(address.slice(0, 6) + "..." + address.slice(-4))
    } else {
      setUserShortAddress("")
    }
  }, [starknetWallet, address])

  return (
    <header className="heading__color--primary text-center flex flex-row justify-between items-center px-1 sm:px-3 md:px-2 py-0 m-0 fixed w-full z-20">
      <div className="flex flex-row items-center">
        <NavLink to={tabs[0].path} className="flex flex-row items-center">
          <img
            src="/images/logo.png"
            alt="B.R.O.L.Y. Logo"
            className="m-1 sm:m-2 w-10 h-10 sm:w-10 sm:h-10 border-[1px] border-[var(--color-secondary)] rounded-full bg-[#a8c8a808]"
          />
          <h1 className="text-xl sm:text-2xl font-bold sm:pl-1">B.R.O.L.Y.</h1>
        </NavLink>
      </div>
      <nav className="flex justify-center flex-row items-center gap-2 md:gap-3 xl:gap-4">
        {tabs.slice(1).map((tab: any, index: number) => (
          <NavLink key={index} to={tab.path} className="tab__nav text-sm sm:text-md md:text-lg xl:text-xl font-bold">
            {tab.name}
          </NavLink>
        ))}
        {/* Starknet Connect */}
        {!starknetWallet.isConnected && (
          <button
            className="button--gradient button__primary text-lg lg:text-xl xl:text-2xl"
            onClick={starknetWallet.connectWallet}
          >
            Login
          </button>
        )}
        {starknetWallet.isConnected && (
          <div className="flex flex-row items-center justify-around gap-1">
            <NavLink to="/account" className="flex flex-row items-center justify-around buttonlike__primary--gradient buttonlike__primary text-md lg:text-lg xl:text-xl">
              <img
                src="/icons/user.png"
                alt="User Icon"
                className="w-4 h-4 sm:w-6 sm:h-6 mr-1 sm:mr-2"
              />
              <p className="mr-1">{userShortAddress}</p>
            </NavLink>
            <button
              className="flex flex-row items-center justify-around buttonlike__primary--gradient buttonlike__primary"
              onClick={starknetWallet.disconnectWallet}
            >
              <img
                src="/icons/logout.png"
                alt="Logout Icon"
                className="w-4 h-4 sm:w-6 sm:h-6 my-1 sm:my-0 lg:my-0.5"
              />
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Header;
