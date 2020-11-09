import { HardhatRuntimeEnvironment } from "hardhat/types";
import {DeployFunction} from 'hardhat-deploy/types';
import { utils, getDefaultProvider, BigNumber } from "ethers";
import ERC20PresetArtifact from "@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json";
import { Token, ChainId, Fetcher, TokenAmount } from "@uniswap/sdk";

const oneEth = utils.parseEther("1");

const mainnetPickles = "0x429881672b9ae42b8eba0e26cd9c73711b891ca5";
const mainnetUni = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
const mainnetWeth = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const liveUniswapAddr = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

async function getPicklesPrice() {
  const mainnetProvider = getDefaultProvider();

  const Pickles = new Token(
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
  const pair = await Fetcher.fetchPairData(Pickles, WETH, mainnetProvider);
  const [price] = pair.getOutputAmount(
    new TokenAmount(Pickles, oneEth.toString())
  );
  const priceStr = (parseFloat(price.toFixed(18)) * 1e18).toString();
  console.log("pickles price: ", priceStr);
  return BigNumber.from(priceStr);
}

const func: DeployFunction = async function(bre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = bre;
  const { deploy, execute, log, read } = deployments;

  const blk = await ethers.provider.getBlockNumber();

  const mainnetPicklePrice = await getPicklesPrice();

  log(
    "Pickles price: ",
    utils.formatEther(mainnetPicklePrice)
  );

  const accts = await getNamedAccounts();
  const { deployer } = accts;

  console.log("deployer: ", deployer)

  let picklesUnderlying: string;
  switch (network.name) {
    case "mainnet":
      picklesUnderlying = mainnetPickles;
      break;
    default:
      const localPickles = await deploy("LocalPickles", {
        from: deployer,
        contract: ERC20PresetArtifact,
        args: ["Local PICKLE", "lPICKLE"],
      });
      picklesUnderlying = localPickles.address;
  }

  let uniAddress: string;
  switch (network.name) {
    case "mainnet":
      uniAddress = mainnetUni;
      break;
    default:
      const localUNI = await deploy("LocalUniV8", {
        from: deployer,
        log: true,
        contract: ERC20PresetArtifact,
        args: ["Local UNI", "lUNI2"],
      });
      uniAddress = localUNI.address;
      if (localUNI.newlyDeployed) {
        await execute(
          "LocalUniV8",
          { from: deployer, log: true },
          "mint",
          accts.l,
          utils.parseUnits("800000", "ether")
        );
        for (let name of Object.keys(accts)) {
          if (!accts[name]) {
            continue;
          }
          await execute(
            "LocalUniV8",
            { from: deployer, log: true },
            "mint",
            accts[name],
            utils.parseUnits("100000", "ether")
          );
        }
      }
  }

  let yolOracleAddress: string;
  switch (network.name) {
    case "mainnet":
      const yolOracle = await deploy("YOLOracle", {
        from: deployer,
        log: true,
        args: [mainnetWeth, liveUniswapAddr], // first one is mainnet weth
      });
      yolOracleAddress = yolOracle.address;
      break;
    default: {
      const oracle = await deploy("DevOracle", {
        from: deployer,
        log: true,
        args: [],
      });
      yolOracleAddress = oracle.address; // use for all oracles

      if (oracle.newlyDeployed) {
        await execute(
          "DevOracle",
          { from: deployer, log: true },
          "setPrice",
          picklesUnderlying,
          mainnetPicklePrice
        );
      }
    }
  }

  const optionsPoolArtifact = await deployments.getArtifact("OptionsPool");

  const picklesPool = await deploy("PICKLESPoolV10", {
    from: deployer,
    log: true,
    contract: optionsPoolArtifact,
  });

  if (picklesPool.newlyDeployed) {
    await execute(
      "PICKLESPoolV10",
      { from: deployer, log: true, gasLimit: 8000000 },
      "initialize",
      deployer,
      uniAddress,
      280, // approximately 1hr epochs
      3, // 3x multiplier,
      yolOracleAddress,
      picklesUnderlying
    );
  }
};
export default func;
