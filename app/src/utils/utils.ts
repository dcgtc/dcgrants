/**
 * @notice Various helper methods and formatters to help display data in the UI nicely
 */
import router from 'src/router/index';
import { RouteLocationRaw } from 'vue-router';
import { Event } from 'ethers';
import { BigNumber, BigNumberish, commify, Contract, ContractTransaction, isAddress, Logger } from 'src/utils/ethers';
import { BatchFilterQuery, EtherscanGroup } from 'src/types';
import useWalletStore from 'src/store/wallet';
import { Grant, GrantRound, MetaPtr, ContributionsDetail } from '@dgrants/types';
import { formatUnits } from 'src/utils/ethers';
import { ETH_ADDRESS } from 'src/utils/constants';
import {
  DEFAULT_PROVIDER,
  ETHERSCAN_BASE_URL,
  FILTER_BLOCK_LIMIT,
  SUPPORTED_TOKENS_MAPPING,
  WETH_ADDRESS,
} from 'src/utils/chains';
import { getMetaPtr } from 'src/utils/data/ipfs';
import { Ref } from 'vue';

// --- Formatters ---
// Returns an address with the following format: 0x1234…abcd
export function formatAddress(address: string) {
  if (!address || address.length !== 42) return '';
  return `${address.slice(0, 6)}…${address.slice(38)}`;
}

// Is the given val defined?
export function isDefined(val: unknown) {
  return !!val;
}

// Formats a number for display to the user, by rounding to the specified number of decimals and adding commas
export function formatNumber(value: BigNumberish, decimals: number): string {
  // `BigNumber.from()` can't take decimal inputs nor exponential inputs
  value = typeof value === 'number' || typeof value === 'string' ? Number(value) : BigNumber.from(value);
  // Return value with minimum number of decimals shown, e.g. return '123' if input is 123.00.
  // When number > MAX_SAFE_INTEGER, we lose precision because JS can't handle numbers that large.
  // When number >= 1e21, it formats the number as 1e+21 instead of 1000...000, causing the call to `commify` to fail
  // because it doesn't support scientific notation. In those cases, we catch the error and convert to a formatted
  // string using `.toLocaleString()`. In reality, we don't want users checking out with numbers that large anyway
  // due to precision loss, and in reality this will not happen because no one owns that many tokens. So the
  // try/catch is mainly for UX reasons here to resolve https://github.com/dcgtc/dgrants/issues/291
  const number = parseFloat(Number(value).toFixed(decimals));
  try {
    return commify(number);
  } catch (err) {
    return number.toLocaleString();
  }
}

// Expects a unix timestamp and will return a human readable message of how far in the past/future it is
export function daysAgo(val = 0) {
  // Use a formatter to establish "in 10 days" vs "10 days ago"
  const formatter = new Intl.RelativeTimeFormat();
  // Number of days since now
  const deltaDays = (val * 1000 - Date.now()) / (1000 * 3600 * 24);

  // Format "days ago" as string
  return formatter.format(Math.round(deltaDays), 'days');
}

// Convert unix ts to DD-MM-YYYY
export function formatDate(dateStr: BigNumber): string {
  const date = new Date(BigNumber.from(dateStr).toNumber() * 1000);
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

// Convert a unix ts to a toLocaleString
export function unixToLocaleString(time: BigNumberish) {
  return new Date(BigNumber.from(time).toNumber() * 1000).toLocaleString();
}

// Normalize twitter handle
export function urlFromTwitterHandle(handle: string) {
  const twitterHandle = handle.includes('@') ? handle.substring(1) : handle;
  return 'https://twitter.com/' + twitterHandle;
}

// Clean twitter url and return the handle
export function cleanTwitterUrl(url: string | undefined) {
  return url ? url.replace('https://twitter.com/', '') : undefined;
}

// Given a metadata pointer object, return a stringified version that can be used as an object key
export function metadataId(metaPtr: MetaPtr = { protocol: 0, pointer: '' }): string {
  if (typeof metaPtr == 'string') {
    metaPtr = decodeMetadataId(metaPtr);
  }

  return `${BigNumber.from(metaPtr.protocol).toString()}-${metaPtr.pointer}`;
}

// Given a metadata ID, decode it back to the original metadata pointer object
export function decodeMetadataId(id: string): MetaPtr {
  const parts = id.split('-');
  return { protocol: parts[0], pointer: parts[1] };
}

// Given a logoPtr, resolve it to a URI that we can fetch
export function ptrToURI(logoPtr: MetaPtr) {
  // Parse the pointer
  const { protocol, pointer } = logoPtr;
  if (protocol === 1) return getMetaPtr({ cid: pointer });
  return null;
}

// --- Validation ---
// Returns true if the provided URL is a valid URL
export function isValidUrl(val: string) {
  // TODO more robust URL validation
  return (val.includes('http') || val.includes('https')) && val.includes('://') && val.includes('.');
}

// Returns true if the provided address is valid (TODO support ENS)
export function isValidAddress(val: string | undefined) {
  return val && isAddress(val);
}

// Returns true if the provided website is a valid option
export function isValidWebsite(val: string | undefined) {
  return val ? isValidUrl(val) : true;
}

// Returns true if the provided URL is a valid Github URL
export function isValidGithub(val: string | undefined) {
  return val ? val.includes('://github.com/') : true;
}

// Returns true if the provided twitter handle is valid
export function isValidTwitter(val: string | undefined) {
  if (!val) return true;
  const handle = val.includes('@') ? val.substring(1) : val;
  return /^[a-zA-Z0-9_]{1,15}$/.test(handle);
}

// Returns true if the provided logo is valid
export async function isValidLogo(file: File | undefined) {
  return false;
  if (!file) return true;
  if (file.size > 5242880) return false;
  if (!(file.type.includes('image/png') || file.type.includes('image/svg') || file.type.includes('image/jpeg')))
    return false;

  const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.src = window.URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
  });

  return dimensions.width >= 500 && dimensions.height >= 500;
}

// Returns true if the provided amount is valid
export function isValidAmount(val: number | undefined) {
  return val && Number(val) && Number(val) > 0;
}

// --- Tokens ---
// Check for approved allowance
export async function checkAllowance(token: Contract, ownerAddress: string | undefined, spenderAddress: string) {
  // return the balance held for userAddress
  return ownerAddress ? await token.allowance(ownerAddress, spenderAddress) : BigNumber.from(0);
}

// Get approval for the round contract to spend the amount on behalf of the user
export async function getApproval(token: Contract, address: string, amount: BigNumberish) {
  // get approval and wait for it to go through (or be replaced/cancelled)
  await watchTransaction(() => token.approve(address, amount));
}

// --- Other ---
// Check against the grantRounds status for a match
export function hasStatus(status: string) {
  // returns a fn (currying the given status)
  return (round: GrantRound) => round.status === status;
}

// Navigates to the specified page and pushes a new entry into the history stack
export async function pushRoute(to: RouteLocationRaw) {
  await router.push(to);
}

// Generates the Etherscan URL based on the given `hash`, `chainId` and `group`
export function getEtherscanUrl(hash: string, group: EtherscanGroup = 'tx') {
  return `${ETHERSCAN_BASE_URL}/${group}/${hash}`;
}

/**
 * @notice Throws an error if the user does not have sufficient balance for the specified token
 * @param tokenAddress Address of the token to check
 * @param requiredAmount Amount required as a raw number, e.g. 5e18 if the user needs 5 DAI
 * @returns True if the user has sufficient balance, or throws otherwise
 */
export async function assertSufficientBalance(tokenAddress: string, requiredAmount: BigNumberish): Promise<boolean> {
  const { userAddress } = useWalletStore();
  if (!userAddress.value) return true; // exit early, don't want any errors thrown
  const isEth = tokenAddress === WETH_ADDRESS;
  tokenAddress = isEth ? ETH_ADDRESS : tokenAddress;
  const abi = ['function balanceOf(address) view returns (uint256)'];
  const token = new Contract(tokenAddress, abi, DEFAULT_PROVIDER);
  const balance = isEth
    ? await DEFAULT_PROVIDER.getBalance(userAddress.value)
    : await token.balanceOf(userAddress.value);
  if (balance.lt(requiredAmount)) {
    const tokenInfo = SUPPORTED_TOKENS_MAPPING[tokenAddress];
    const { symbol, decimals } = tokenInfo;
    const balanceNeeds = formatNumber(formatUnits(requiredAmount, decimals), 4);
    const balanceHas = formatNumber(formatUnits(balance, decimals), 4);
    throw new Error(
      `Insufficient ${symbol} balance: Current cart requires ${balanceNeeds} ${symbol}, but you only have ${balanceHas} ${symbol}`
    );
  }
  return true;
}

/**
 * @notice Await for a transaction to complete and watch for replacements
 *
 * This should be used whenever you would normally reach for tx.wait();
 *
 * example:
 *
 * ```
 *
 *     // this will be updated with the transaction hash even if a replacement is sent
 *     const txHash = ref<string>('');
 *
 *     // here we wrap a contract interaction in a anon fn so that we can catch any errors
 *     // watchTransaction will resolve to a mined tx, and txHash will hold the resolved tx hash
 *     const tx = await watchTransaction(() => registry.updateGrantOwner(grantId, owner), txHash);
 *
 *     // get the tx receipt
 *     const receipt = tx.wait();
 *
 *     ...
 *
 * ```
 *
 * @param call ()=>ContractTransaction A call to init the transaction
 * @param stateRef Ref<hash> A pointer to update with the tx hash/state
 * @returns Promise<ContractTransaction> A promise of the final ContractTransaction that replaces the initial call() response
 */
export async function watchTransaction(
  call: () => Promise<ContractTransaction>,
  stateRef?: Ref
): Promise<ContractTransaction> {
  // tx is picked up from the provided call and updated if replaced
  let tx: ContractTransaction;
  // do the call inside a try catch so that we see the error first
  try {
    // get the ContractTransaction from the call
    tx = await call();
    // set the new tx.hash into the stateRef
    if (stateRef) {
      stateRef.value = tx.hash;
    }
    // wait for the transaction to be mined
    await tx.wait();
  } catch (error) {
    if (error.code === Logger.errors.TRANSACTION_REPLACED) {
      // recursively watch for completion of replacement
      if (!error.cancelled) {
        // the user used "speed up" or something similar
        // in their client, but we now have the updated info
        tx = await watchTransaction(() => error.replacement, stateRef);
      } else if (stateRef) {
        stateRef.value = '';
      }
    }
  }

  // wrap the tx in a promise to ensure consistent typing
  return new Promise((resolve) => resolve(tx));
}

/**
 * @notice Get the multicall data for the fns on a contract @ address
 * @param calls {target, contract, fns} The address, contract and fns we want to call via multicall
 * @returns A list of calls we can make to multicall.tryBlockAndAggregate()
 */
export const getMulticallData = (
  calls: {
    target: string;
    contract: Contract;
    fns: (string | { fn: string; args: (string | BigNumberish | boolean)[] })[];
  }[]
) => {
  const flatMap: {
    target: string;
    callData: string;
  }[] = [];
  calls.forEach((call) =>
    flatMap.push(
      ...call.fns.map((fn) => {
        const args = typeof fn === 'string' ? [fn] : [fn.fn, fn.args];
        return {
          target: call.target,
          callData: call.contract.interface.encodeFunctionData(
            args[0] as string,
            args[1] as (string | BigNumberish | boolean)[]
          ),
        };
      })
    )
  );

  return flatMap;
};

/**
 * @notice Decode the returnData we get by calling multicall.tryBlockAndAggregate
 * @param returnData An array of multicall.tryBlockAndAggregate results
 * @param calls {contract, fns} The contract and fns we want to decode the result for
 * @returns all results returned in an array
 */
export const decodeMulticallReturnData = (
  returnData: { success: boolean; returnData: string }[],
  calls: { contract: Contract; fns: (string | { fn: string; args: (string | BigNumberish | boolean)[] })[] }[]
) => {
  let flatPtr = 0;
  const flatMap: (string | BigNumberish | boolean)[] = [];
  calls.forEach((call) =>
    flatMap.push(
      ...call.fns.map((fn) => {
        const data = call.contract.interface.decodeFunctionResult(
          typeof fn === 'string' ? fn : fn.fn,
          returnData[flatPtr++].returnData
        );
        // If the call returned one element, just get rid of the array wrapper and return the data directly.
        // If the call returned multiple elements (i.e. metaPtr returns an object), we want to preserve that structure
        return data.length === 1 ? data[0] : data;
      })
    )
  );

  return flatMap;
};

/**
 * @notice Get the response from a call to multicall for the given fns on a contract @ address
 * @param calls {target, contract, fns} The address, contract and fns we want to call via multicall
 * @returns all results returned in an array
 */
export async function callMulticallContract(
  calls: { target: string; contract: Contract; fns: (string | { fn: string; args: (string | BigNumberish)[] })[] }[]
) {
  const { multicall } = useWalletStore();
  const { returnData } = (await multicall.value?.tryBlockAndAggregate(false, getMulticallData(calls))) || {};

  return decodeMulticallReturnData(returnData, calls);
}

/**
 * @notice Batch filter calls so that no block exceeds the FILTER_BLOCK_LIMIT
 * @param query {contract, filter, args} The contract, filter and args we want to query
 * @param startBlock Number The block we want to query from
 * @param endBlock Number The block we want to query to
 * @returns all results returned in an array
 */
export async function batchFilterCall(query: BatchFilterQuery, startBlock: number, endBlock: number) {
  // collect a list of blocks to feed to promise.all
  const forBlocks = [];
  // startBlock exceeds endBlock after final batch
  while (startBlock < endBlock) {
    // get the results
    forBlocks.push({
      startBlock: startBlock,
      // stop at the endBlock
      endBlock:
        FILTER_BLOCK_LIMIT === -1 || startBlock + FILTER_BLOCK_LIMIT > endBlock
          ? endBlock
          : startBlock + FILTER_BLOCK_LIMIT,
    });
    // move to the next block or end
    startBlock += FILTER_BLOCK_LIMIT === -1 ? endBlock : FILTER_BLOCK_LIMIT;
  }

  // await for each query filter
  const events = await Promise.all(
    forBlocks.map((block) =>
      query.contract.queryFilter(query.contract.filters[query.filter](...query.args), block.startBlock, block.endBlock)
    )
  );

  // flat map the results
  return events.reduce((res: Event[], resSet: Event[]) => {
    res.push(...resSet);

    return res;
  }, [] as Event[]);
}

/**
 * @notice Sort GrantRound by startTime
 * @param a GrantRound
 * @param b GrantRound
 */
export const sortByStartTime = (a: GrantRound, b: GrantRound) => {
  return BigNumber.from(a.startTime).toNumber() < BigNumber.from(b.startTime).toNumber()
    ? -1
    : BigNumber.from(a.startTime).toNumber() === BigNumber.from(b.startTime).toNumber()
    ? 0
    : 1;
};

/**
 * @notice sort contributions by amount
 * @param contributions ContributionsDetail
 */
export function sortContributionsByAmount(contributions: ContributionsDetail[]) {
  return contributions.sort((c1, c2) => c2.amount - c1.amount);
}

/**
 * @notice Encode all HTML in a given string
 * @param string A string containing HTML tags
 * @returns string An encoded version of the input string
 */
export function sanitizeHTML(str: string) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Shuffles list of grants / grant rounds
 * @param unshuffled
 * @returns shuffled
 */
export const shuffle = (unshuffled: Grant[] | GrantRound[]) => {
  const shuffled = unshuffled
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

  return shuffled;
};

/**
 * @notice Recursively grab every 'page' of results - please note that the query MUST return the ID field
 *
 * @param string url the url we will recursively fetch from
 * @param string key the key in the response object which holds results
 * @param function query a function which will return the query string (with the page in place)
 * @param array before the current array of objects
 */
export const recursiveGraphFetch = async (
  url: string,
  key: string,
  query: (filter: string) => string,
  fromBlock: number,
  additionalFilter = '',
  before: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
Promise<any[]> => {
  // retrieve the last ID we collected to use as the starting point for this query
  const fromId = before.length ? before[before.length - 1].id : false;

  // fetch this 'page' of results - please note that the query MUST return an ID
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query(`
        first: 1000, 
        where: {
          ${fromId ? `id_gt: "${fromId}",` : ''}
          ${fromBlock ? `lastUpdatedBlockNumber_gte: "${fromBlock}",` : ''}
          ${additionalFilter}
        }
      `),
    }),
  });

  // resolve the json
  const json = await res.json();

  // if there were results on this page then check the next
  if (!json.data[key].length) {
    // return the full result
    return [...before];
  } else {
    // return the result combined with the next page
    return await recursiveGraphFetch(url, key, query, fromBlock, additionalFilter, [...before, ...json.data[key]]);
  }
};
