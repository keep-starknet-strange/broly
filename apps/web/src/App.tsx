import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router'
import { CallData, RpcProvider, constants, byteArray, uint256 } from 'starknet';
import { useConnect, useDisconnect, useAccount, useContract, useSendTransaction } from '@starknet-react/core'
import { useStarknetkitConnectModal, StarknetkitConnector } from "starknetkit";
import './App.css'
import Header from './components/Header'
import orderbook_abi from './abi/orderbook.abi.json';

import Home from './pages/Home'
import Inscriptions from './pages/Inscriptions'
import Collection from './pages/Collection'
import Info from './pages/Info'
import Inscription from './pages/Inscription'
import Request from './pages/Request'

export const NODE_URL = 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7';
export const STARKNET_CHAIN_ID = constants.StarknetChainId.SN_SEPOLIA;

//export const provider = new RpcProvider([NODE_URL], STARKNET_CHAIN_ID);
export const provider = new RpcProvider({
  nodeUrl: NODE_URL,
  chainId: STARKNET_CHAIN_ID
});

function App() {
  // TODO: Move to seperate module ( starknet stuff )
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, status } = useAccount()
  const { starknetkitConnectModal } = useStarknetkitConnectModal({
    connectors: connectors as StarknetkitConnector[]
  })
  const [isConnected, setIsConnected] = useState(false)
  const [connector, setConnector] = useState(null as StarknetkitConnector | null)

  const connectWallet = async () => {
    // TODO: If no wallet/connectors?
    // TODO: Auto-reconnect on page refresh?
    const { connector } = await starknetkitConnectModal()
    if (!connector) {
      return
    }
    connect({ connector })
    setConnector(connector)
  }

  useEffect(() => {
    if (!connectors) return;
    if (connectors.length === 0) return;
    if (isConnected) return;

    const connectIfReady = async () => {
      for (let i = 0; i < connectors.length; i++) {
        let ready = await connectors[i].ready();
        if (ready) {
          connect({ connector: connectors[i] })
          //setConnector(connectors[i])
          break;
        }
      }
    };
    connectIfReady();
  }, [connectors]);

  useEffect(() => {
    if (status === 'connected') {
      setIsConnected(true)
    } else if (status === 'disconnected') {
      setIsConnected(false)
    }
  }, [address, status])

  const disconnectWallet = async () => {
    if (!isConnected || !connector) {
      return
    }
    disconnect()
    setConnector(null)
    setIsConnected(false)
  }

  const toHex = (str: string) => {
    let hex = '0x';
    for (let i = 0; i < str.length; i++) {
      hex += '' + str.charCodeAt(i).toString(16);
    }
    return hex;
  };

  const { contract: orderbookContract } = useContract({
    address: import.meta.env.VITE_BROLY_CONTRACT_ADDRESS,
    abi: orderbook_abi as any
  });

  const [calls, setCalls] = useState([] as any[])
  const requestInscriptionCall = async ({type, inscription_data, bitcoin_address, fee_token, fee}:
  {type: string, inscription_data: string, bitcoin_address: string, fee_token: string, fee: number}) => {
    if (!address || !orderbookContract) {
      return
    }

    const calldata = CallData.compile([
      byteArray.byteArrayFromString(type + ":" + inscription_data),
      byteArray.byteArrayFromString(bitcoin_address),
      toHex(fee_token),
      uint256.bnToUint256(fee)
    ]);
    setCalls(
      [orderbookContract.populate('request_inscription', calldata)]
    )
  }
  const { send, data, isPending } = useSendTransaction({
    calls
  });
  useEffect(() => {
    const requestCall = async () => {
      if (calls.length === 0) return;
      send();
      console.log('Call successful:', data, isPending);
      // TODO: Update the UI with the new vote count
    };
    requestCall();
  }, [calls]);

  const cancelInscriptionCall = async () => {
    // TODO
  }

  const [tabs, _setTabs] = useState([
    { name: 'Home', path: '/', component: Home as any },
    { name: 'Inscriptions', path: '/inscriptions', component: Inscriptions },
    { name: 'Collection', path: '/collection', component: Collection },
    { name: 'Info', path: '/info', component: Info },
  ])
  const tabProps = {
    requestInscriptionCall,
    cancelInscriptionCall,
    orderbookContract
  }

  // TODO: <Route path="*" element={<NotFound />} />
  return (
    <div className="h-screen relative">
      <Header tabs={tabs} connectWallet={connectWallet} isConnected={isConnected} disconnectWallet={disconnectWallet} />
      <div className="h-[4.5rem]" />
      <Routes>
        {tabs.map((tab) => (
          <Route key={tab.path} path={tab.path} element={<tab.component {...tabProps} />} />
        ))}
        <Route path="/inscription/:id" element={<Inscription {...tabProps} />} />
        <Route path="/request/:id" element={<Request {...tabProps} />} />
      </Routes>
    </div>
  )
}

export default App;
