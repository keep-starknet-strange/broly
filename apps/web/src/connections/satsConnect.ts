import Wallet, { AddressPurpose, RpcErrorCode } from "sats-connect";

/**
 * Connect to a Bitcoin wallet using sats-connect.
 * @returns {Promise<{ paymentAddress: string | null; ordinalsAddress: string | null; stacksAddress: string | null }>}
 * Returns an object containing payment, ordinals, and stacks addresses or null if the connection fails.
 */
export async function connectBitcoinWallet(): Promise<{
  paymentAddress: string | null;
  ordinalsAddress: string | null;
  stacksAddress: string | null;
}> {
  try {
    const response = await Wallet.request('wallet_connect', {
      message: 'Fetch Bitcoin addresses',
      addresses: [AddressPurpose.Payment, AddressPurpose.Ordinals, AddressPurpose.Stacks],    
    });


    if (response.status === 'success') {
      const paymentAddressItem = response.result.addresses.find(
        (address) => address.purpose === AddressPurpose.Payment
      );
      const ordinalsAddressItem = response.result.addresses.find(
        (address) => address.purpose === AddressPurpose.Ordinals
      );
      const stacksAddressItem = response.result.addresses.find(
        (address) => address.purpose === AddressPurpose.Stacks
      );

      const result = {
        paymentAddress: paymentAddressItem?.address || null,
        ordinalsAddress: ordinalsAddressItem?.address || null,
        stacksAddress: stacksAddressItem?.address || null,
      };
      return result;
    } else {
      if (response.error.code === RpcErrorCode.USER_REJECTION) {
        console.error('User rejected the connection.');
      } else {
        console.error('Connection error:', response.error.message);
      }
      return { paymentAddress: null, ordinalsAddress: null, stacksAddress: null };
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else if (typeof err === 'object' && err !== null && 'error' in err) {
      console.error((err as any).error.message);
    } else {
      console.error('An unknown error occurred.');
    }
    return { paymentAddress: null, ordinalsAddress: null, stacksAddress: null };
  }
}
