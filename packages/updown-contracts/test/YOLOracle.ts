import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { utils, Signer, constants } from "ethers";

import { YolOracle } from "../types/ethers-contracts/YolOracle";

import ERC20PresetArtifact from "@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json";
import { Erc20PresetMinterPauser } from "../types/ethers-contracts/Erc20PresetMinterPauser";
import UniswapFactoryArtifact from "@uniswap/v2-core/build/UniswapV2Factory.json";
import { IUniswapV2Factory } from "../types/ethers-contracts/IUniswapV2Factory";
import UniswapRouterArtifact from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import { UniswapV2Router02 } from "../types/ethers-contracts/UniswapV2Router02";
import { deploy } from "./helpers/deployer";

const { deployContract } = waffle;

const oneEth = utils.parseUnits("1", "ether");

describe("YOLOracle", async () => {
  let underlyingToken: Erc20PresetMinterPauser;
  let weth: Erc20PresetMinterPauser;
  let uniswapFactory: IUniswapV2Factory;
  let uniswapRouter: UniswapV2Router02;

  let oracle: YolOracle;

  let operator: Signer;
  let operatorAddr: string;

  let alice: Signer;
  let aliceAddr: string;

  let bob: Signer;
  let bobAddr: string;

  beforeEach(async () => {
    const signers = await ethers.getSigners();

    operator = signers[0];
    operatorAddr = await operator.getAddress();

    alice = signers[1];
    aliceAddr = await alice.getAddress();

    bob = signers[2];
    bobAddr = await bob.getAddress();

    underlyingToken = (await deployContract(signers[0], ERC20PresetArtifact, [
      "FakeDai",
      "tDai",
    ])) as Erc20PresetMinterPauser;

    weth = (await deployContract(signers[0], ERC20PresetArtifact, [
      "WrappedEther",
      "WETH",
    ])) as Erc20PresetMinterPauser;

    await weth.mint(aliceAddr, oneEth.mul(1000));
    await underlyingToken.mint(aliceAddr, oneEth.mul(1000));

    uniswapFactory = (await deployContract(signers[0], UniswapFactoryArtifact, [
      operatorAddr,
    ])) as IUniswapV2Factory;

    oracle = await deploy<YolOracle>(
      "YOLOracle",
      weth.address,
      uniswapFactory.address
    );

    uniswapRouter = (await deployContract(
      signers[0],
      UniswapRouterArtifact,
      [uniswapFactory.address, weth.address],
      { gasLimit: 7000000 }
    )) as UniswapV2Router02;
  });

  it("works with uniswap liquidity", async () => {
    await (
      await uniswapFactory.createPair(underlyingToken.address, weth.address)
    ).wait();

    await weth.connect(alice).approve(uniswapRouter.address, oneEth.mul(5));
    await underlyingToken.connect(alice).approve(uniswapRouter.address, oneEth);

    await uniswapRouter
      .connect(alice)
      .addLiquidity(
        underlyingToken.address,
        weth.address,
        oneEth.mul(1),
        oneEth.mul(5),
        oneEth.mul(1),
        oneEth.mul(5),
        aliceAddr,
        constants.MaxUint256
      );

    // see: https://github.com/Uniswap/uniswap-sdk/blob/v2/src/entities/token.ts#L37
    const idx =
      underlyingToken.address.toLowerCase() > weth.address.toLowerCase()
        ? 0
        : 1;

    expect(await oracle.getAssetPrice(underlyingToken.address)).to.equal(
      oneEth.mul(5)
    );
  });
});
