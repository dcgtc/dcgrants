import metadataRaw from './grant-round-metadata.json';
const metadataJson = JSON.stringify(metadataRaw);

type NetworkParams = {
  // GrantRoundManager parameters
  donationToken: string;
  uniswapFactory: string;
  weth: string;
  // GrantRound parameters
  metadataAdmin: string;
  payoutAdmin: string;
  matchingToken: string;
  roundStartTime: number;
  roundEndTime: number;
  minContribution: string;
  ipfsRetrievalEndpoint: string;
  metadataJson: string;
};

type DeployParams = Record<string, NetworkParams>;

const params: DeployParams = {
  hardhat: {
    donationToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    uniswapFactory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    metadataAdmin: '0x0000000000000000000000000000000000000000',
    payoutAdmin: '0x0000000000000000000000000000000000000000',
    matchingToken: '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F', // GTC
    roundStartTime: 1661990400, // Thursday, September 1, 2022 12:00:00 AM GMT
    roundEndTime: 1663200000, // Thursday, September 15, 2022 12:00:00 AM GMT
    minContribution: '1000000000000000000', // 1 DAI in wei
    ipfsRetrievalEndpoint: 'https://ipfs-dev.fleek.co/ipfs',
    metadataJson,
  },
  mainnet: {
    donationToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    uniswapFactory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    metadataAdmin: '0x0000000000000000000000000000000000000000',
    payoutAdmin: '0x0000000000000000000000000000000000000000',
    matchingToken: '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F', // GTC
    roundStartTime: 0,
    roundEndTime: 0,
    minContribution: '1000000000000000000', // 1 DAI in wei
    ipfsRetrievalEndpoint: 'https://ipfs-dev.fleek.co/ipfs',
    metadataJson,
  },
};

export default params;