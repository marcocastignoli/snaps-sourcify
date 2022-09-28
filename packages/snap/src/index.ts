import { OnRpcRequestHandler } from '@metamask/snap-types';
// import { evaluateCallDataFromTx } from 'contract-call-decoder-2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import radspec from 'radspec';

import { decode as cborDecode } from 'cbor-x';
import bs58 from 'bs58';

import { ethers } from 'ethers';

const evaluate = async function (
  expression: any,
  abi: any,
  transaction: any,
): Promise<string> {
  // Set userDoc and ABI from above
  const call = {
    abi,
    transaction,
  };
  return await radspec(expression, call);
};

const findSelectorAndAbiItemFromSignatureHash = (
  functionSignatureHash: any,
  abi: any,
) => {
  const interf = new ethers.utils.Interface(abi);
  const selector = Object.keys(interf.functions).find((sel) => {
    return interf.getSighash(sel) === functionSignatureHash;
  });
  // TODO: handle error
  return {
    selector,
    abi: interf.functions[selector || ''],
  };
};

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.request - A validated JSON-RPC request object.
 * @returns `null` if the request succeeded.
 * @throws If the request method is not valid for this snap.
 * @throws If the `snap_confirm` call failed.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({ request }) => {
  switch (request.method) {
    case 'promptDecodedTransaction': {
      const tx = (request.params as any).transaction;
      const chainId = wallet.networkVersion;

      const provider = new ethers.providers.Web3Provider(wallet as any);

      const bytecode = await provider.getCode(tx.to);

      const ipfsHashLength = parseInt(`${bytecode.slice(-4)}`, 16);
      const cborEncoded = bytecode.substring(
        bytecode.length - 4 - ipfsHashLength * 2,
        bytecode.length - 4,
      );

      const contractMetadata = cborDecode(Buffer.from(cborEncoded, 'hex'));

      let contractMetadataJSON: any;
      try {
        const req = await fetch(
          `https://cloudflare-ipfs.com/ipfs/${bs58.encode(
            contractMetadata.ipfs,
          )}`,
        );
        contractMetadataJSON = await req.json();
      } catch (e) {
        console.log(e);
        return false;
      }

      const metadata = contractMetadataJSON;

      const functionSignatureHash = tx.data.slice(0, 10);

      const { selector } = findSelectorAndAbiItemFromSignatureHash(
        functionSignatureHash,
        metadata.output.abi,
      );

      const notice = await evaluate(
        metadata.output.userdoc.methods[selector || ''].notice,
        metadata.output.abi,
        tx,
      );

      let verifiedAlert = `The contract is not verified`;
      try {
        const res = await fetch(
          `https://repo.sourcify.dev/contracts/full_match/${chainId}/${tx.to}/metadata.json`,
        );
        if (res) {
          verifiedAlert = 'The contract is verified with Sourcify';
        }
      } catch (e) {
        console.log(e);
      }

      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: `Decoded Transaction`,
            description: verifiedAlert,
            textAreaContent: notice,
          },
        ],
      });
    }
    default:
      throw new Error('Method not found.');
  }
};
