import { HardhatRuntimeEnvironment } from "hardhat/types";
import {DeployFunction} from 'hardhat-deploy/types';

import { utils } from "ethers";
import { RebaseableTokenFactory } from "../types/ethers-contracts/RebaseableTokenFactory";

const oneEth = utils.parseEther("1");

export const balancer = {
  kovan: {
    "Core Pool Factory": "0x8f7F78080219d4066A8036ccD30D588B416a40DB",
    BalancerSafeMath: "0x0fd81EFddb4f8b2948B164145FbbcC8084136DcB",
    RightsManager: "0xFd069b1d2daC3d1C277BeFa8E51Aad77D9f9167B",
    SmartPoolManager: "0x8DBB8C9bFEb7689f16772c85136993cDA0c05eA4",
  },
  mainnet: {
    "Core Pool Factory": "0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd",
    BalancerSafeMath: "0xCfE28868F6E0A24b7333D22D8943279e76aC2cdc",
    RightsManager: "0x0F811b1AF2B6B447B008eFF31eCceeE5A0b1d842",
    SmartPoolManager: "0xA3F9145CB0B50D907930840BB2dcfF4146df8Ab4",
  },
};

const func: DeployFunction = async function(bre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = bre;
  const { deploy, execute, read } = deployments;

  const { deployer, alice } = await getNamedAccounts();

  // only do this locally (which is a fork of mainnet)
  if (!network.live) {
    const aliceSigner = (await ethers.getSigners())[1];

    const balancerAddrs = balancer.mainnet

    const picklesPool = await deployments.get("PICKLESPoolV10");
    const upAddr = await read("PICKLESPoolV10", { from: deployer }, "up");
    const downAddr = await read("PICKLESPoolV10", { from: deployer }, "down");

    const up = RebaseableTokenFactory.connect(upAddr, aliceSigner);
    const down = RebaseableTokenFactory.connect(downAddr, aliceSigner);

    const stakeAmount = oneEth.mul(1000); // she will stake 1000 uni

    await execute(
      "LocalUniV8",
      { from: alice, log: true },
      "approve",
      picklesPool.address,
      stakeAmount
    );

    await execute(
      "PICKLESPoolV10",
      { from: alice, log: true },
      "deposit",
      stakeAmount
    );

    const swapFee = 10 ** 15;
    const startWeights = [oneEth.mul(20), oneEth.mul(20)];
    const startBalances = [stakeAmount.mul(100), stakeAmount.mul(100)];

    const esPoolArtifact = await deployments.getArtifact("ESBalancerPool");

    const poolParams = {
      poolTokenSymbol: "UpDnPickle15min",
      poolTokenName: "Up Down Test up/down pairs",
      constituentTokens: [up.address, down.address],
      tokenBalances: startBalances,
      tokenWeights: startWeights,
      swapFee: swapFee,
    };

    const permissions = {
      canPauseSwapping: false,
      canChangeSwapFee: false,
      canChangeWeights: true,
      canAddRemoveTokens: false,
      canWhitelistLPs: false,
      canChangeCap: false,
    };

    const espool = await deploy("PicklesBPoolV4", {
      contract: esPoolArtifact,
      from: alice,
      args: [balancerAddrs["Core Pool Factory"], poolParams, permissions],
      libraries: {
        BalancerSafeMath: balancerAddrs["BalancerSafeMath"],
        RightsManager: balancerAddrs["RightsManager"],
        SmartPoolManager: balancerAddrs["SmartPoolManager"],
      },
    });

    await up.approve(espool.address, stakeAmount.mul(100));
    await down.approve(espool.address, stakeAmount.mul(100));

    await execute(
      "PicklesBPoolV4", 
      {
      log: true,
      from: alice,
      },
      "createPool(uint256)",
      oneEth.mul(100), // means 100 initial supply
    );

    await execute(
      "PicklesBPoolV4", 
      {
      log: true,
      from: alice,
      },
      "setController",
      picklesPool.address,
    );

    await execute(
      "PICKLESPoolV10",
      { from: deployer, log: true },
      "setESPool",
      espool.address,
    );

  }
};
export default func;
