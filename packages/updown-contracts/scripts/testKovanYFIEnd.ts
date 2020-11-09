import { Wallet, getDefaultProvider, utils, BigNumber } from 'ethers'
import { OptionsPoolFactory } from '../types/ethers-contracts/OptionsPoolFactory'
import { DevOracleFactory } from "../types/ethers-contracts/DevOracleFactory";
import PoolArtifact from '../deployments/kovan/YFIPool.json'
import OracleArtifact from "../deployments/kovan/DevOracle.json";
import YFIArtifact from "../deployments/kovan/LocalYFI.json";
import { ChainId, TokenAmount, Fetcher, Token } from "@uniswap/sdk";

const mainnetYFI = "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e";
const mainnetWeth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

const oneEth = utils.parseEther("1");


async function main() {
  const poolDeployment = PoolArtifact

  //TODO: allow different networks
  const kovanProvider = getDefaultProvider('kovan', {
    infura: process.env.PROJECT_ID,
  })
  const wallet = Wallet.fromMnemonic(process.env.KOVAN_MNEMONIC!).connect(
    kovanProvider
  )

  const pool = OptionsPoolFactory.connect(poolDeployment.address, wallet)
  const end = (await pool.epochStart()).add(await pool.epochLength())

  const currBlock = await kovanProvider.getBlockNumber()
  if (currBlock >= end.toNumber()) {
    console.log("updating yfi price")

    const devOracle = DevOracleFactory.connect(OracleArtifact.address, wallet);

    const mainnetProvider = getDefaultProvider("mainnet", {
      infura: process.env.PROJECT_ID,
    });

    const YFI = new Token(
      ChainId.MAINNET,
      mainnetYFI,
      18,
      "YFI",
      "Yearn Finance"
    );
    const WETH = new Token(
      ChainId.MAINNET,
      mainnetWeth,
      18,
      "weth",
      "Wrapped Ether"
    );
    const yfiPair = await Fetcher.fetchPairData(YFI, WETH, mainnetProvider);
  
    const [yfiPrice] = yfiPair.getOutputAmount(
      new TokenAmount(YFI, oneEth.toString())
    );
    console.log("YFI: ", yfiPrice.toFixed(18));
  
    const yfiPriceStr = (parseFloat(yfiPrice.toFixed(18)) * 1e18).toString();
    const resp = await devOracle.setPrice(YFIArtifact.address, BigNumber.from(yfiPriceStr));
    await resp.wait()
    
    console.log("testing YFI POOL for end");
    return pool.testForEnd({
      gasLimit: 1000000,
    });
  }
  return null
}

main()
    .then(async (response) => {
      if (response) {
        console.log("response: ", response)
        const receipt = await response.wait()
        console.log("receipt: ", receipt)
      }
    
      process.exit(0)
    })
    .catch(error => {
      console.log("err: ", error)
      process.exit(1)
    })
