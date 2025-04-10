import { useState, useEffect } from "react";
import { useAccount } from '@starknet-react/core';
import { Buffer } from 'buffer';
import "../DropButton.css";
import "./Form.css";
import { Script } from '@scure/btc-signer';

if (typeof window !== 'undefined' && !window.Buffer) {
  (window as any).Buffer = Buffer;
}

const tags = {
  contentType: 1,
  pointer: 2,
  parent: 3,
  metadata: 5,
  metaprotocol: 7,
  contentEncoding: 9,
  delegate: 11,
  rune: 13,
};

function chunkData(data: Uint8Array, chunkSize: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  while (offset < data.length) {
    const size = Math.min(chunkSize, data.length - offset);
    chunks.push(data.slice(offset, offset + size));
    offset += size;
  }
  return chunks;
}

function prepareInscription(
  marker: string,
  contentType: string,
  payloadData: Uint8Array
): string {
  const script = Script.encode([
    // TODO: check if it is better to omit "OP_0" here, or in the orderbook contract check
    "IF",
    new TextEncoder().encode(marker),
    new Uint8Array([tags.contentType]),
    new TextEncoder().encode(contentType),
    // TODO: check below
    // new Uint8Array([0x02]),
    // new Uint8Array([0x00]),
    "OP_0",
    ...(payloadData.length > 520 ? chunkData(payloadData, 520) : [payloadData]),
    "ENDIF",
  ]);
  return Buffer.from(script).toString("hex");
}

function prepareTextInscription(text: string): string {
  return prepareInscription(
    "ord",
    "text/plain;charset=utf-8",
    new TextEncoder().encode(text)
  );
}

function prepareEmojiInscription(emoji: string): string {
  return prepareInscription(
    "ord",
    "text/plain;charset=utf-8",
    new TextEncoder().encode(emoji)
  );
}

export function hexDecode(hex: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
}

export function hexEncode(array: Uint8Array): string {
  return Array.from(array)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function InscriptionForm(props: any) {
  const dropOptions = ["Text", "Emoji"];
  const [selectedOption, setSelectedOption] = useState(dropOptions[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(""); 
  const [errorMessage, setErrorMessage] = useState("");
  const [taprootAddressShort, setTaprootAddressShort] = useState("");

  useEffect(() => {
    if (props.taprootAddress) {
      const taprootAddressShort = props.taprootAddress.slice(0, 6) + "..." + props.taprootAddress.slice(-6);
      setTaprootAddressShort(taprootAddressShort);
    }
  }, [props.taprootAddress]);

  const { address } = useAccount();
  useEffect(() => {
    setTimeout(() => {
      setErrorMessage("");
    }, 500);
  }, [address, props.taprootAddress]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    let dataToInscribe = "";
    if (!address) {
      setErrorMessage("Please login to inscribe");
      props.starknetWallet.connectWallet();
      return;
    }
    const taprootAddress = props.taprootAddress;
    if (!taprootAddress) {
      setErrorMessage("Please link your Bitcoin Wallet (Xverse)");
      props.bitcoinWallet.connectWallet();
      return;
    }

    if (selectedOption === "Text") {
      const textAreaElement = document.querySelector<HTMLTextAreaElement>(".Form__textarea");
      dataToInscribe = textAreaElement?.value || "";
      if (!dataToInscribe) {
        setErrorMessage("Please enter a message to inscribe");
        return;
      }
      dataToInscribe = prepareTextInscription(dataToInscribe);
    } else if (selectedOption === "Emoji") {
      if (!selectedEmoji) {
        setErrorMessage("Please select an emoji");
        return;
      }
      dataToInscribe = prepareEmojiInscription(selectedEmoji);
    }

    setErrorMessage("");
    await props.requestInscriptionCall(dataToInscribe, taprootAddress, "STRK", 0); 
    props.setIsInscribing(true);
  };

  const emojis = ["🤩", "😊", "😢", "😎", "🎉", "🔥", "💯", "😍", "😂", "🥳", "😜", "🤔", "🤯", "👑", "🧡", "🤍", "🖤", "🤗", "😇", "😈", "👻",
    "💔", "💪", "✨", "🌈", "🌟", "🚀", "🌍", "❄️", "🍕", "🍔", "🍣", "🍩", "🍪", "🥐", "🍭", "🥨", "🌹", "🌻", "🌸",
    "🍎", "🍉", "🍓", "🍇", "🍉", "🍌", "🍍", "🥑", "🥥", "🫐", "🍒", "🍋", "🍊", "🥝", "🥭", "🍑"];

  const handleEmojiClick = (emoji: string) => {
    setSelectedEmoji(emoji); 
  };

  const handleBackspace = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && selectedEmoji) {
      setSelectedEmoji("");
    }
  };

  useEffect(() => {
    if (selectedOption === "Text") {
      setSelectedEmoji("");
    }
  }, [selectedOption]);

  const [inscribingDots, setInscribingDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setInscribingDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <form className="flex flex-col items-center justify-center w-[90%] sm:w-[70%] md:w-[60%] lg:w-[50%] xl:w-[35%] px-8 py-4 gap-2 bg-[var(--color-tertiary-dark)] rounded-xl shadow-xl" onSubmit={handleSubmit}>
      <div className="flex flex-row items-center justify-around gap-2 w-full bg-[var(--color-primary)] rounded-[1.5rem] p-1">
        {dropOptions.map((option, index) => (
          <button
            key={index}
            type="button"
            className={`w-full h-[2.4rem] ${selectedOption === option ? "Form__selection--selected" : "Form__selection"}`}
            onClick={() => setSelectedOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex-grow Form__input h-[35vh]">
        {selectedOption === "Text" ? (
          <textarea
            className="text-lg Form__textarea"
            placeholder="Enter a message to inscribe..."
            onKeyDown={handleBackspace}
          />
        ) : (
          <div className="flex gap-2 p-1 flex-wrap justify-center items-center h-full">
            {selectedEmoji ? (
              <div
                className="flex items-center justify-center w-full h-full hover:scale-110 transition-transform duration-200 ease-in-out cursor-pointer
                           hover:opacity-80 active:opacity-100 active:scale-100"
                onClick={() => setSelectedEmoji("")}
              >
                <span className="text-6xl">{selectedEmoji}</span>
              </div>
            ) : (
              emojis.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-3xl hover:scale-110 transition-transform duration-200 ease-in-out"
                >
                  {emoji}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <div className="relative py-2 flex flex-col gap-4 justify-center items-center w-full">
        {!props.taprootAddress && (
          <button type="button" className="button__secondary--gradient button__secondary text-2xl" onClick={props.bitcoinWallet.connectWallet}>
            Link Xverse
          </button>
        )}
        {props.taprootAddress && (
          <button type="button" className="buttonlike__primary--gradient buttonlike__primary" onClick={props.bitcoinWallet.disconnectWallet}>
            Linked BTC Wallet : {taprootAddressShort}
          </button>
        )}
        {props.isInscribing ? (
          <button
            type="button"
            className="button__primary--disabled button__primary text-2xl w-min"
          >
            Inscribing{inscribingDots}
          </button>
        ) : (
          <button
            type="submit"
            className={`button--gradient button__primary text-2xl w-min ${!props.taprootAddress || !props.isStarknetConnected ? "button__primary--disabled" : "button__primary--pinging"}`}
          >
            Inscribe
          </button>
        )}
        {errorMessage && (
          <div className="absolute bottom-[-1rem] transform -translate-x-1/2 left-1/2">
            <p className="text-red-500 text-md text-center text-nowrap">
              {errorMessage}
            </p>
          </div>
        )}
      </div>
    </form>
  );
}

export default InscriptionForm;
