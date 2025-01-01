import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router'
import { CallData, RpcProvider, constants, byteArray, uint256 } from 'starknet';
import { useConnect, useDisconnect, useAccount, useContract, useSendTransaction } from '@starknet-react/core'
import { useStarknetkitConnectModal, StarknetkitConnector } from "starknetkit";
import { connectBitcoinWallet } from './connections/satsConnect';
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
  const [isStarknetConnected, setIsStarknetConnected] = useState(false)

  // Bitcoin Wallet State
  const [bitcoinWallet, setBitcoinWallet] = useState<{
    paymentAddress: string | null
    ordinalsAddress: string | null
    stacksAddress: string | null
  }>({ paymentAddress: null, ordinalsAddress: null, stacksAddress: null })

  const connectStarknetWallet = async () => {
    // TODO: If no wallet/connectors?
    // TODO: Auto-reconnect on page refresh?
    const { connector } = await starknetkitConnectModal()
    if (!connector) {
      return
    }
    connect({ connector })
  }

  useEffect(() => {
    if (!connectors) return;
    if (connectors.length === 0) return;
    if (isStarknetConnected) return;

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
      setIsStarknetConnected(true);
    } else {
      setIsStarknetConnected(false);
    }
  }, [status]);

  const disconnectStarknetWallet = async () => {
    await disconnect();
    setIsStarknetConnected(false);
  };

  const [taprootAddress, setTaprootAddress] = useState<string | null>(null)

  const connectBitcoinWalletHandler = async () => {
    const addresses = await connectBitcoinWallet()
    // TODO: replace with the Ordinals address.
    // Currently the sats connect lib fetches 
    // only the Payments address from Xverse.
    if (addresses.paymentAddress) {
      setTaprootAddress(addresses.paymentAddress)
      setBitcoinWallet((prev) => ({
        ...prev,
        paymentAddress: addresses.paymentAddress,
      }))
    } else {
      console.error('Ordinals address not found in wallet connection')
    }
  }
    
  const disconnectBitcoinWallet = () => {
    setBitcoinWallet({ paymentAddress: null, ordinalsAddress: null, stacksAddress: null });
    setTaprootAddress(null);
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
  
  const requestInscriptionCall = async (dataToInscribe: string, taprootAddress: string) => {
    if (!address || !orderbookContract) {
      return
    }
  
    const calldata = CallData.compile([
      byteArray.byteArrayFromString(dataToInscribe),
      byteArray.byteArrayFromString(taprootAddress),
      Number(100), // TODO remove when contract is re-deployed
      toHex("STRK"),
      uint256.bnToUint256(2000),
    ])
  
    setCalls([await orderbookContract.populate('request_inscription', calldata)])
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
      <Header
        tabs={tabs}
        starknetWallet={{
          isConnected: isStarknetConnected,
          connectWallet: connectStarknetWallet,
          disconnectWallet: disconnectStarknetWallet
        }}
        bitcoinWallet={{
          paymentAddress: bitcoinWallet.paymentAddress,
          ordinalsAddress: bitcoinWallet.ordinalsAddress,
          stacksAddress: bitcoinWallet.stacksAddress,
          connectWallet: connectBitcoinWalletHandler,
          disconnectWallet: disconnectBitcoinWallet
        }}
      />      
      <div className="h-[4.5rem]" />
      <Routes>
        {tabs.map((tab) => (
          <Route
            key={tab.path}
            path={tab.path}
            element={
              <tab.component
                taprootAddress={taprootAddress}
                connectBitcoinWalletHandler={connectBitcoinWalletHandler}
                disconnectBitcoinWallet={disconnectBitcoinWallet}
                isBitcoinWalletConnected={!!taprootAddress}
                isStarknetConnected={isStarknetConnected}
                {...tabProps}
              />
            }
          />
        ))}
        <Route path="/inscription/:id" element={<Inscription {...tabProps} />} />
        <Route path="/request/:id" element={<Request {...tabProps} />} />
      </Routes>

    </div>
  )
}

export default App;
