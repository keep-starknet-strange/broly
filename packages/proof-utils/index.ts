import { serializeKeypathTx } from './src/encodeBitcoinTransactionToArray.js';
import * as fs from 'fs';

const taprootTxJson = JSON.parse(fs.readFileSync('./transaction.json', 'utf-8'));

const main = () => {
  const serializedArray = serializeKeypathTx(taprootTxJson);
  console.log(serializedArray.map(n => n.toString()));
};

main();