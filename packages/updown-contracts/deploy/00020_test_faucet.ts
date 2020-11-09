import { HardhatRuntimeEnvironment } from "hardhat/types";
import {DeployFunction} from 'hardhat-deploy/types';

import { utils } from "ethers";

const oneEth = utils.parseEther("1");

const func: DeployFunction = async function(bre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = bre;
  const { deploy, execute, get, log } = deployments;

  const { deployer } = await getNamedAccounts();

  const codes = [
    "checkmate-b4-to-b7",
    "lucerne-is-helpful",
    "zlatan-is-the-greatest-of-all-time",
    "nairamarley-is-greatest-of-all-time",
    "bellashmuda-is-greatest-of-all-time",
    "are-you-not-entertained-by-wizdom",
    "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks",
    "house-approves-2.2t-stimulus-package",
    "do-you-want-to-play-a-game",
    "how-about-a-nice-game-of-chess",
  ];

  // only do this on goerli and local
  if (['goerli', 'kovan'].includes(network.name) || !network.live) {
    const uni = await get("LocalUniV8");
    const faucetArtifact = await deployments.getArtifact("Faucet");

    const faucet = await deploy("FaucetV3", {
      from: deployer,
      log: true,
      contract: faucetArtifact,
      args: [uni.address],
    });

    if (faucet.newlyDeployed) {
      await execute(
        "LocalUniV8",
        { from: deployer, log: true },
        "mint",
        faucet.address,
        oneEth.mul(100000).mul(codes.length)
      );

      for (let code of codes) {
        log("adding: ", code);
        await execute(
          "FaucetV3",
          { from: deployer, log: true },
          "addCode",
          utils.solidityKeccak256(["string"], [code]),
          oneEth.mul(100000)
        );
      }
    }
  }
};
export default func;
