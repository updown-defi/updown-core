import { HardhatRuntimeEnvironment } from "hardhat/types";
import {DeployFunction} from 'hardhat-deploy/types';

import { utils, getDefaultProvider } from "ethers";
import ERC20PresetArtifact from "@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json";
import { IPriceOracleGetterFactory } from "../types/ethers-contracts/IPriceOracleGetterFactory";

const mainnetYFI = "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e";
const mainnetDai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

const AAVEMainnetAddress = "0x76b47460d7f7c5222cfb6b6a75615ab10895dde4";

async function getYFIPrice() {
  const mainnetProvider = getDefaultProvider();
  const mainnetPricer = IPriceOracleGetterFactory.connect(
    AAVEMainnetAddress,
    mainnetProvider
  ); // AAVE price oracle
  return mainnetPricer.getAssetPrice(mainnetYFI);
}

const func: DeployFunction = async function(bre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = bre;
  const { deploy, execute } = deployments;
  const accts = await getNamedAccounts();
  const { deployer } = accts;

  const blk = await ethers.provider.getBlockNumber();

  const mainnetYFIPrice = await getYFIPrice();

  let yfiUnderlying: string;
  switch (network.name) {
    case "mainnet":
      yfiUnderlying = mainnetYFI; // YFI on mainnet
      break;
    default:
      const localYFI = await deploy("LocalYFI", {
        from: deployer,
        contract: ERC20PresetArtifact,
        args: ["Local YFI", "lYFI"],
      });
      yfiUnderlying = localYFI.address;
  }

  let daiAddress: string;
  switch (network.name) {
    case "mainnet":
      daiAddress = mainnetDai;
      break;
    default:
      const local20 = await deploy("Local20", {
        from: deployer,
        log: true,
        contract: ERC20PresetArtifact,
        args: ["FakeDai", "tDai"],
      });
      daiAddress = local20.address;
      if (local20.newlyDeployed) {
        for (let name of Object.keys(accts)) {
          if (!accts[name]) {
            continue;
          }
          await execute(
            "Local20",
            { from: deployer, log: true },
            "mint",
            accts[name],
            utils.parseUnits("100000", "ether")
          );
        }
      }
  }

  let oracleAddress: string;
  switch (network.name) {
    case "mainnet":
      oracleAddress = AAVEMainnetAddress; // https://etherscan.io/address/0x76b47460d7f7c5222cfb6b6a75615ab10895dde4#readContract
      break;
    default: {
      const oracle = await deployments.get("DevOracle")
      oracleAddress = oracle.address;

        await execute(
          "DevOracle",
          { from: deployer, log: true },
          "setPrice",
          yfiUnderlying,
          mainnetYFIPrice
        );
    }
  }

  const optionsPoolArtifact = await deployments.getArtifact("OptionsPool");

  const yfiPool = await deploy("YFIPool", {
    from: deployer,
    log: true,
    contract: optionsPoolArtifact,
  });

  if (yfiPool.newlyDeployed) {
    await execute(
      "YFIPool",
      { from: deployer, log: true, gasLimit: 5500000 },
      "initialize",
      deployer,
      daiAddress,
      46523, // 1 week epochs
      2, // 2x multiplier,
      oracleAddress,
      yfiUnderlying
    );
  }
};
export default func;
