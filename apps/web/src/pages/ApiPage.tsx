function ApiPage(_props: any) {
  // TODO: Diagrams
  return (
    <div className="w-full flex flex-col items-center h-max bg__color--primary border-t-2 border-[var(--color-primary-light)]">
      <div className="w-full flex flex-col items-center justify-center py-2">
        <img src="/images/logo-high.png" alt="logo" className="w-26 h-26" />
        <h1 className="text__color--primary text-6xl font-bold px-4 mt-4">B.R.O.L.Y.</h1>
        <h2 className="text__color--primary text-xl px-4">Bitcoin Registry Orchestrates Like Yesterday</h2>
        <div className="flex flex-row items-center justify-center gap-2 py-1">
          <a href="https://github.com/keep-starknet-strange/broly" target="_blank" rel="noreferrer" className="w-12 h-12 flex items-center justify-center rounded-full
            hover:scale-105 transition-transform duration-200 ease-in-out">
            <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" alt="github" className="w-8 h-8" />
          </a>
          <a href="https://x.com/BrandonR505" target="_blank" rel="noreferrer" className="w-12 h-12 flex items-center justify-center rounded-full
            hover:scale-105 transition-transform duration-200 ease-in-out">
            <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/x-social-media-black-icon.png" alt="twitter" className="w-8 h-8" />
          </a>
          <a href="https://t.me/ShinigamiStarknet" target="_blank" rel="noreferrer" className="w-12 h-12 flex items-center justify-center rounded-full
            hover:scale-105 transition-transform duration-200 ease-in-out">
            <img src="https://static.vecteezy.com/system/resources/previews/031/737/167/non_2x/telegram-icon-telegram-social-media-logo-free-png.png" alt="telegram" className="w-12 h-12" />
          </a>
        </div>
      </div>
      <div className="w-[99%] h-[6px] bg-[var(--color-primary-light)] mb-1 rounded-lg shadow-xl"></div>
      <div className="w-full flex flex-col">
        <h3 className="text__color--primary text-2xl sm:text-4xl font-bold px-8 mt-4">About</h3>
        <div className="w-[98%] mx-[1%] h-[2px] bg-[var(--color-primary-light)] mb-1 rounded-lg"></div>
        <p className="text__color--primary text-xl sm:text-2xl px-8 mt-2 italic">Order on Starknet, write on Bitcoin, get money trustlessly, repeat</p>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">Broly is a decentralized Bitcoin inscription service that uses Starknet for orderbook management. It enables a trustless Bitcoin inscription network with guaranteed payments through smart contracts and escrows. This project demonstrates a method for L2s like Starknet to send messages to/from Bitcoin L1 through the use of an inventivized network of relays/inscriptors!</p>
      </div>
      <div className="w-full flex flex-col">
        <h3 className="text__color--primary text-2xl sm:text-4xl font-bold px-8 mt-4">How To Use</h3>
        <div className="w-[98%] mx-[1%] h-[2px] bg-[var(--color-primary-light)] mb-1 rounded-lg"></div>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">1. Connect your Starknet wallet</p>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">2. Connect your Bitcoin xVerse wallet</p>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">3. On the home page, upload your image or write a message</p>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">4. Click Inscribe to create an Inscription Order</p>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">5. Wait for inscriptor to take your order & inscribe your message</p>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">6. Enjoy your inscription on the Bitcoin blockchain triggered from your Starknet wallet!</p>
      </div>
      <div className="w-full flex flex-col">
        <h3 className="text__color--primary text-2xl sm:text-4xl font-bold px-8 mt-4">How It Works</h3>
        <div className="w-[98%] mx-[1%] h-[2px] bg-[var(--color-primary-light)] mb-1 rounded-lg"></div>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">1. User connects both Bitcoin and Starknet wallets</p>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">2. User creates an inscription order</p>
        <p className="text__color--primary text-md sm:text-lg px-16 mt-1">Specifies inscription content and reward amount</p>
        <p className="text__color--primary text-md sm:text-lg px-16 mt-1">Order is created on Starknet orderbook</p>
        <p className="text__color--primary sm:text-lg px-16 mt-1">Funds are locked in the contract</p>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">3. Inscriber service</p>
        <p className="text__color--primary text-md sm:text-lg px-16 mt-1">Monitors pending orders & locks any orders taken</p>
        <p className="text__color--primary text-md sm:text-lg px-16 mt-1">Creates Bitcoin inscriptions</p>
        <p className="text__color--primary text-md sm:text-lg px-16 mt-1">Triggers reward release on successful inscription</p>
        <p className="text__color--primary text-lg sm:text-xl px-8 mt-2">4. User receives inscription, inscribor receives reward</p>
      </div>
      <div className="w-full flex flex-col h-20"></div>
    </div>
  );
}

export default ApiPage;
