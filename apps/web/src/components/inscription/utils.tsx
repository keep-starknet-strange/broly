export const hexToString = (hex: string) => {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}
export const hexToInt = (hex: string) => {
  return parseInt(hex, 16);
}

export const typesMap: { [key: string]: string } = {
  "text/plain;charset=utf-8": "text",
  "text/plain": "text",
  "image/png": "image",
  "image/jpeg": "image",
  "image/gif": "image",
  "image/webp": "image"
};

export const parseBitcoinInscriptionData = (data: string) => {
  let type = "unknown";
  let inscriptionData = "";
  const expectedStart = "63036f7264"; // "OP_IF OP_PUSH ord"
  if (!data.startsWith(expectedStart)) {
    console.error("Invalid inscription data format");
    return { type, inscriptionData };
  }
  // Remove the prefix
  data = data.slice(expectedStart.length + 4); // Remove expectedStart + tag
  const typeLength = hexToInt(data.slice(0, 2)); // Get the length of the type string
  const typeString = hexToString(data.slice(2, 2 + typeLength * 2)); // Extract the type string
  type = typesMap[typeString] || "unknown"; // Map to the known types
  data = data.slice(2 + typeLength * 2); // Remove the type string from the data
  data = data.slice(10); // Remove other metadata
  const inscriptionDataLength = hexToInt(data.slice(0, 2)); // Get the length of the inscription data
  inscriptionData = hexToString(data.slice(2, 2 + inscriptionDataLength * 2)); // Extract the inscription data
  return { type, inscriptionData };
}
