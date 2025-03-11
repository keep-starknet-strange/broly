import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router'
import { CallData, RpcProvider, constants, byteArray, uint256 } from 'starknet';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useConnect, useDisconnect, useAccount, useContract, useSendTransaction } from '@starknet-react/core'
import { useStarknetkitConnectModal, StarknetkitConnector } from "starknetkit";
import { connectBitcoinWallet } from './connections/satsConnect';
import { getInscriptionRequest, getInscription } from './api/inscriptions';
import './App.css'
import Header from './components/Header'
import erc20_abi from './abi/erc20.abi.json';
import orderbook_abi from './abi/orderbook.abi.json';

import Home from './pages/Home'
import Inscriptions from './pages/Inscriptions'
import Info from './pages/Info'
import Inscription from './pages/Inscription'
import Request from './pages/Request'
import Account from './pages/Account'

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
        const ready = await connectors[i].ready();
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
    if (addresses.ordinalsAddress) {
      setTaprootAddress(addresses.ordinalsAddress)
      setBitcoinWallet({
        paymentAddress: addresses.paymentAddress,
        ordinalsAddress: addresses.ordinalsAddress,
        stacksAddress: addresses.stacksAddress
      })
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

  const { contract: strkContract } = useContract({
    address: import.meta.env.VITE_STRK_CONTRACT_ADDRESS,
    abi: erc20_abi as any
  });
  const { contract: orderbookContract } = useContract({
    address: import.meta.env.VITE_BROLY_CONTRACT_ADDRESS,
    abi: orderbook_abi as any
  });

  const [calls, setCalls] = useState([] as any[])
  const requestInscriptionCall = async (dataToInscribe: string, taprootAddress: string, feeToken: string, fee: number) => {
    if (!address || !orderbookContract || !strkContract) {
      return
    }
  
    /* global BigInt */
    const strkDecimals = BigInt(10) ** BigInt(18)
    const bnFee = strkDecimals * (BigInt(fee.toFixed(0)) + BigInt(1))
    console.log('Request inscription', dataToInscribe, taprootAddress, feeToken, fee, bnFee)
    const calldata = CallData.compile([
      byteArray.byteArrayFromString(dataToInscribe),
      byteArray.byteArrayFromString(taprootAddress),
      toHex(feeToken),
      uint256.bnToUint256(bnFee)
    ])
    const approveCalldata = CallData.compile([
      orderbookContract.address,
      uint256.bnToUint256(bnFee)
    ])
  
    setCalls([
      strkContract.populate('approve', approveCalldata),
      orderbookContract.populate('request_inscription', calldata)
    ])
  }
  
  const { send, data, isPending } = useSendTransaction({
    calls
  });
  useEffect(() => {
    const requestCall = async () => {
      if (calls.length === 0) return;
      send();
      console.log('Call successful:', data, isPending);
      // TODO: Update the UI
    };
    requestCall();
  }, [calls]);

  const cancelInscriptionCall = async (inscriptionId: number) => {
    if (!address || !orderbookContract) {
      return
    }
  
    console.log('Cancel inscription', inscriptionId)
    const calldata = CallData.compile([
      inscriptionId,
      toHex('STRK')
    ])
  
    setCalls([orderbookContract.populate('cancel_inscription', calldata)])
  }

// TODO:  { name: 'Collections', path: '/collection', component: Collection },
  const [tabs, _setTabs] = useState([
    { name: 'Home', path: '/', component: Home as any },
    { name: 'Inscriptions', path: '/inscriptions', component: Inscriptions },
    { name: 'Info', path: '/info', component: Info }
  ])
  const tabProps = {
    requestInscriptionCall,
    cancelInscriptionCall,
    strkContract,
    orderbookContract
  }

  // Websocket connection
  let wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8083/ws';
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(wsUrl, {
    share: false,
    shouldReconnect: (_e) => true,
    reconnectAttempts: 10,
    reconnectInterval: (attempt) => Math.min(10000, Math.pow(2, attempt) * 1000)
  });

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({
        event: 'subscribe',
        data: {
          channel: 'general'
        }
      });
    }
  }, [readyState]);

  const [updateRequest, setUpdateRequest] = useState<{ id: number, status: string } | null>(null);
  const [newInscription, setNewInscription] = useState<any>(null);
  const [requestedInscription, setRequestedInscription] = useState<any>(null);
  useEffect(() => {
    const processMessage = async (message: any) => {
      if (message) {
        if (message.messageType === 'requestCreated') {
          let requester = message.requester;
          if (address && requester === address.substring(2)) {
            let inscriptionId = message.inscriptionId;
            let request = await getInscriptionRequest(inscriptionId);
            if (request && request.data) {
              setRequestedInscription(request.data);
            }
          }
        } else if (message.messageType === 'requestCancelled') {
          let inscriptionId = message.inscriptionId;
          setUpdateRequest({ id: inscriptionId, status: '-1' });
        } else if (message.messageType === 'requestLocked') {
          let inscriptionId = message.inscriptionId;
          setUpdateRequest({ id: inscriptionId, status: '1' });
        } else if (message.messageType === 'requestCompleted') {
          let inscriptionId = message.inscriptionId;
          setUpdateRequest({ id: inscriptionId, status: '2' });
          let inscription = await getInscription(inscriptionId);
          if (inscription && inscription.data) {
            setNewInscription(inscription.data);
          }
        }
      }
    }

    processMessage(lastJsonMessage);
  }, [lastJsonMessage]);


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
      <div className="h-[3rem] sm:h-[3.5rem]" />
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
                requestedInscription={requestedInscription}
                updateRequest={updateRequest}
                newInscription={newInscription}
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
                {...tabProps}
              />
            }
          />
        ))}
        <Route path="/inscription/:id" element={<Inscription {...tabProps} />} />
        <Route path="/request/:id" element={<Request {...tabProps} />} />
        <Route path="/account" element={<Account />} />
      </Routes>

    </div>
  )
}

export default App;
