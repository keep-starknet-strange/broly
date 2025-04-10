import { Script } from '@scure/btc-signer';

export const hexToString = (hex: string) => {
  const bytes = hexToBytes(hex);
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(bytes);
};

export const hexToBytes = (hex: string) => {
  const length = hex.length / 2;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
};

export const hexToInt = (hex: string) => {
  return parseInt(hex, 16);
};

export const typesMap: { [key: string]: string } = {
  "text/plain;charset=utf-8": "text",
  "text/plain": "text",
};

export const parseBitcoinInscriptionData = (data: string) => {
  let type = "unknown";
  let inscriptionData = "";

  if (data.startsWith("63036f7264")) { // "OP_IF OP_PUSH ord"
    const bytes = hexToBytes(data);
    
    // Decode the script
    const script = Script.decode(bytes);
    console.log('Decoded script:', script);
    
    // The script should contain:
    // 1. OP_IF
    // 2. "ord" push
    // 3. Type length push
    // 4. Type string push
    // 5. Content length push
    // 6. Content push
    // 7. OP_ENDIF
    
    const typeBytes = script[3] as Uint8Array;
    const typeString = hexToString(Array.from(typeBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    type = typesMap[typeString] || "unknown";
    
    const contentBytes = script[5] as Uint8Array;
    inscriptionData = hexToString(Array.from(contentBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    console.log('Final content:', inscriptionData);
  } else if (data.includes(":")) {
    const [typeStr, ...contentParts] = data.split(":");
    type = typeStr;
    inscriptionData = contentParts.join(":");
  }

  return { type, inscriptionData };
}
