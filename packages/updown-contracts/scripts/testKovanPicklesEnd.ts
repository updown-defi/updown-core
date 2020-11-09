import { Wallet, getDefaultProvider, utils, BigNumber } from "ethers";
import { OptionsPoolFactory } from "../types/ethers-contracts/OptionsPoolFactory";
import { DevOracleFactory } from "../types/ethers-contracts/DevOracleFactory";
import PoolArtifact from "../deployments/kovan/PICKLESPoolV10.json";
import PicklesArtifact from "../deployments/kovan/LocalPickles.json";
import OracleArtifact from "../deployments/kovan/DevOracle.json";
import { ChainId, TokenAmount, Fetcher, Token } from "@uniswap/sdk";

const mainnetPickles = "0x429881672b9ae42b8eba0e26cd9c73711b891ca5";
const mainnetWeth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

const oneEth = utils.parseEther("1");

async function main() {
  const poolDeployment = PoolArtifact;

  //TODO: allow different networks
  const kovanProvider = getDefaultProvider("kovan", {
    infura: process.env.PROJECT_ID,
  });
  const wallet = Wallet.fromMnemonic(process.env.KOVAN_MNEMONIC!).connect(
    kovanProvider
  );

  const pool = OptionsPoolFactory.connect(poolDeployment.address, wallet);

  const end = (await pool.epochStart()).add(await pool.epochLength())

  const currBlock = await kovanProvider.getBlockNumber()
  if (currBlock >= end.toNumber()) {
    console.log("updating pickles price")

    const devOracle = DevOracleFactory.connect(OracleArtifact.address, wallet);

    const mainnetProvider = getDefaultProvider("mainnet", {
      infura: process.env.PROJECT_ID,
    });
  
    const PICKLE = new Token(
      ChainId.MAINNET,
      mainnetPickles,
      18,
      "PICKLE",
      "Pickles"
    );
    const WETH = new Token(
      ChainId.MAINNET,
      mainnetWeth,
      18,
      "weth",
      "Wrapped Ether"
    );
    const picklesPair = await Fetcher.fetchPairData(
      PICKLE,
      WETH,
      mainnetProvider
    );
  
    const [picklesPrice] = picklesPair.getOutputAmount(
      new TokenAmount(PICKLE, oneEth.toString())
    );
    console.log("PICKLES: ", picklesPrice.toFixed(18));
  
    const picklesPriceStr = (
      parseFloat(picklesPrice.toFixed(18)) * 1e18
    ).toString();
    const resp = await devOracle.setPrice(
      PicklesArtifact.address,
      BigNumber.from(picklesPriceStr)
    );
    await resp.wait()
    
    console.log("testing pickles POOL for end");

    return pool.testForEnd({
      gasLimit: 1000000,
    });
  }
  return null
}

main()
  .then(async (response) => {
    if (response) {
      console.log("response: ", response);
      const receipt = await response.wait();
      console.log("receipt: ", receipt);
    }

    process.exit(0);
  })
  .catch((error) => {
    console.log("err: ", error);
    process.exit(1);
  });
