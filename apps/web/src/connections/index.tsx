import ARGENT_X_ICON from '../assets/argent-x.svg'
import ARGENTMOBILE_ICON from '../assets/argentmobile.svg'
import BRAAVOS_ICON from '../assets/braavos.svg'
import WEBWALLET_ICON from '../assets/webwallet.svg'
import { ArgentMobileConnector } from 'starknetkit/argentMobile'
import { InjectedConnector } from 'starknetkit/injected'
import { WebWalletConnector } from 'starknetkit/webwallet'

enum ConnectionType {
  ARGENT_X = 'ARGENT_X',
  BRAAVOS = 'BRAAVOS',
  WEBWALLET = 'WEBWALLET',
  ARGENTMOBILE = 'ARGENTMOBILE',
}

export interface L2Connection {
  getName(): string
  connector: InjectedConnector | ArgentMobileConnector | WebWalletConnector
  type: ConnectionType
  getIcon?(): string
  shouldDisplay(): boolean
  overrideActivate?: () => boolean
}

export type Connection = L2Connection

// ARGENT X

const starknetArgentXWallet = new InjectedConnector({ options: { id: 'argentX' } })

const argentXWalletConnection: L2Connection = {
  getName: () => 'Argent X',
  connector: starknetArgentXWallet,
  type: ConnectionType.ARGENT_X,
  getIcon: () => ARGENT_X_ICON,
  shouldDisplay: () => true,
  // If on non-injected, non-mobile browser, prompt user to install ArgentX
  overrideActivate: () => {
    return false
  },
}

// BRAAVOS

const starknetBraavosWallet = new InjectedConnector({ options: { id: 'braavos' } })

const braavosWalletConnection: L2Connection = {
  getName: () => 'Braavos',
  connector: starknetBraavosWallet,
  type: ConnectionType.BRAAVOS,
  getIcon: () => BRAAVOS_ICON,
  shouldDisplay: () => true,
  // If on non-injected, prompt user to install Braavos
  overrideActivate: () => {
    return false
  },
}

// WEB WALLET

const webWallet = new WebWalletConnector({ url: 'https://web.argent.xyz' })

const webWalletConnection: L2Connection = {
  getName: () => 'Argent Web Wallet',
  connector: webWallet,
  type: ConnectionType.WEBWALLET,
  getIcon: () => WEBWALLET_ICON,
  shouldDisplay: () => true,
}

// ARGENT MOBILE

const argentMobile = new ArgentMobileConnector()

const argentMobileConnection: L2Connection = {
  getName: () => 'Argent (mobile)',
  connector: argentMobile,
  type: ConnectionType.ARGENTMOBILE,
  getIcon: () => ARGENTMOBILE_ICON,
  shouldDisplay: () => true,
}

// GETTERS

export function getL2Connections() {
  return [argentXWalletConnection, argentMobileConnection, braavosWalletConnection, webWalletConnection]
}
