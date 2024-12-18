import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router'
import { connect, disconnect } from "starknetkit";
import { CallData, Contract, RpcProvider, constants, byteArray } from 'starknet';
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
  const [starkWallet, setWallet] = useState(null as any)
  const [starkConnector, setConnector] = useState(null as any)
  const [starkConnectorData, setConnectorData] = useState(null as any)
  const [starkAddress, setAddress] = useState(null as any)
  const [starkAccount, setStarkAccount] = useState(null as any)

  const connectWallet = async () => {
    // TODO: If no wallet/connectors?
    // TODO: Auto-reconnect on page refresh?
    const { wallet, connector, connectorData } = await connect({
      modalMode: "alwaysAsk",
      modalTheme: "dark"
    })
    if (!wallet || !connector || !connectorData) {
      return
    }

    setWallet(wallet)
    setConnector(connector)
    setConnectorData(connectorData)
    setAddress(connectorData.account)
    let new_account = await connector.account(provider);
    setStarkAccount(new_account);
  }

  const disconnectWallet = async () => {
    if (starkConnector) {
      await disconnect()
    }

    setWallet(null)
    setConnector(null)
    setConnectorData(null)
    setAddress(null)
  }

  const toHex = (str: string) => {
    let hex = '0x';
    for (let i = 0; i < str.length; i++) {
      hex += '' + str.charCodeAt(i).toString(16);
    }
    return hex;
  };

  const estimateInvokeFee = async ({
    contractAddress,
    entrypoint,
    calldata
  }: {
    contractAddress: any;
    entrypoint: any;
    calldata: any;
  }) => {
    try {
      const { suggestedMaxFee } = await starkAccount.estimateInvokeFee({
        contractAddress: contractAddress,
        entrypoint: entrypoint,
        calldata: calldata
      });
      return { suggestedMaxFee };
    } catch (error) {
      console.error(error);
      return { suggestedMaxFee: BigInt(1000000000000000) };
    }
  };

  const [orderbookContract, setOrderbookContract] = useState(null as any)
  useEffect(() => {
    if (!starkConnector || !starkAccount) {
      return
    }

    const newOrderbookContract = new Contract(
      orderbook_abi,
      import.meta.env.VITE_ORDERBOOK_CONTRACT_ADDRESS,
      starkAccount
    )

    setOrderbookContract(newOrderbookContract)
  }, [starkConnector, starkAccount])

  const requestInscriptionCall = async () => {
    if (!starkAddress || !orderbookContract) {
      return
    }
    const calldata = CallData.compile([
      byteArray.byteArrayFromString("message:Hello, Starknet!"),
      byteArray.byteArrayFromString("tb1234567890123456789012345678901234567890"),
      Number(100),
      toHex("STRK"),
      Number(2000)
    ]);
    console.log(calldata);
    const requestCalldata = orderbookContract.populate(
      "request_inscription",
      calldata,
      //{
      //  inscription_data: byteArray.byteArrayFromString("message:Hello, Starknet!"),
      //  receiving_address: toHex("tb1234567890123456789012345678901234567890"),
      //  satoshi: Number(100),
      //  currency_fee: toHex("STRK"),
      //  submitter_fee: Number(2000),
      //}
    );
    const { suggestedMaxFee } = await estimateInvokeFee({
      contractAddress: orderbookContract.address,
      entrypoint: "request_inscription",
      calldata: requestCalldata.calldata
    });
    /* global BigInt */
    const maxFee = (suggestedMaxFee * BigInt(15)) / BigInt(10);
    const result = await orderbookContract.request_inscription(
      requestCalldata.calldata,
      {
        maxFee
      }
    );
    console.log(result);
  }

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
    orderbookContract,
    starkAddress
  }

  // TODO: <Route path="*" element={<NotFound />} />
  return (
    <div className="h-screen relative">
      <Header tabs={tabs} connectWallet={connectWallet} address={starkAddress} disconnectWallet={disconnectWallet} />
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
