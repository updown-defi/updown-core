import { HardhatRuntimeEnvironment } from "hardhat/types";
import {DeployFunction} from 'hardhat-deploy/types';

import { utils } from "ethers";
import { time } from "../test/helpers/time";

const oneEth = utils.parseEther("1");

const func: DeployFunction = async function(bre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = bre;
  const { deploy, execute, get, log } = deployments;

  const { deployer } = await getNamedAccounts();

  // only do this on goerli and local
  if (["goerli", "kovan"].includes(network.name) || !network.live) {
    const chk = await deploy("CheckToken", {
      from: deployer,
      log: true,
    });

    //  TODO: timelock should own queen
    const timelock = await deploy("Timelock", {
      from: deployer,
      log: true,
      args: [deployer, time.duration.days(2), chk.address],
    });

    const queen = await deploy("Queen", {
      from: deployer, // TODO: transfer to timelock
      args: [chk.address, 1000, 11151344, 11151344 + 11151344], // start 29 Oct - go for ever basically TODO: these are the wrong dates
    });

    if (chk.newlyDeployed) {
      await execute(
        "CheckToken",
        { from: deployer, log: true },
        "transferOwnership",
        queen.address
      );
    }

    if (queen.newlyDeployed) {
      const yfiBPool = await deployments.get("YFIBPoolV2");
      const picklesBPool = await deployments.get("PicklesBPoolV4");
      await execute(
        "Queen",
        { from: deployer, log: true },
        "add",
        100,
        picklesBPool.address,
        true
      );

      await execute(
        "Queen",
        { from: deployer, log: true },
        "add",
        100,
        yfiBPool.address,
        true
      );
    }
  }
};
export default func;
