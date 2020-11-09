import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { utils, Signer, constants } from "ethers";

import ERC20PresetArtifact from "@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json";
import { OptionsPool } from "../../types/ethers-contracts/OptionsPool";
import { RebaseableToken } from "../../types/ethers-contracts/RebaseableToken";
import { RebaseableTokenFactory } from "../../types/ethers-contracts/RebaseableTokenFactory";
import { DevOracle } from "../../types/ethers-contracts/DevOracle";
import { Erc20PresetMinterPauser } from "../../types/ethers-contracts/Erc20PresetMinterPauser";
import { IFullBPoolFactory } from "../../types/ethers-contracts/IFullBPoolFactory";
import { EsBalancerPool } from "../../types/ethers-contracts/EsBalancerPool";

import { Queen } from "../../types/ethers-contracts/Queen";
import { CheckToken } from "../../types/ethers-contracts/CheckToken";
import { Timelock } from "../../types/ethers-contracts/Timelock";

import { time } from "../helpers/time";
const { deployContract } = waffle;
import { deploy } from "../helpers/deployer";
import { IFullBPool } from "../../types/ethers-contracts/IFullBPool";

const oneEth = utils.parseUnits("1", "ether");

describe("FullDeployedWithFarming", async () => {
  let payoutToken: Erc20PresetMinterPauser;
  let underlying: Erc20PresetMinterPauser;

  let upToken: RebaseableToken;
  let downToken: RebaseableToken;
  let optionsPool: OptionsPool;
  let oracle: DevOracle;

  let esPool: EsBalancerPool;
  let bpool: IFullBPool;

  let queen: Queen;
  let checkToken: CheckToken;
  let timelock: Timelock;

  let lucerne: Signer;
  let lucerneAddr: string;

  let alice: Signer;
  let aliceAddr: string;

  let bob: Signer;
  let bobAddr: string;

  let startBlock: number = 0;

  beforeEach(async () => {
    startBlock = await ethers.provider.getBlockNumber();
    const signers = await ethers.getSigners();

    lucerne = signers[0];
    lucerneAddr = await lucerne.getAddress();

    alice = signers[1];
    aliceAddr = await alice.getAddress();

    bob = signers[2];
    bobAddr = await bob.getAddress();

    const tokenOperator = signers[4];

    oracle = await deploy<DevOracle>("DevOracle");

    payoutToken = (await deployContract(tokenOperator, ERC20PresetArtifact, [
      "FakeDai",
      "tDai",
    ])) as Erc20PresetMinterPauser;

    await payoutToken.mint(aliceAddr, oneEth.mul(1000));
    await payoutToken.mint(bobAddr, oneEth.mul(1000));
    await payoutToken.mint(lucerneAddr, oneEth.mul(1000));

    underlying = (await deployContract(tokenOperator, ERC20PresetArtifact, [
      "UnderlyingAsset",
      "PICKLE",
    ])) as Erc20PresetMinterPauser;

    await oracle.setPrice(underlying.address, 100);

    checkToken = await deploy<CheckToken>("CheckToken");

    queen = await deploy<Queen>(
      "Queen",
      checkToken.address,
      oneEth.mul(100),
      startBlock + 100,
      startBlock + 1100
    );

    await checkToken.transferOwnership(queen.address);

    optionsPool = await deploy<OptionsPool>("OptionsPool");

    await optionsPool.initialize(
      lucerneAddr,
      payoutToken.address,
      1,
      1,
      oracle.address,
      underlying.address
    );
    upToken = new RebaseableTokenFactory(signers[0]).attach(
      await optionsPool.up()
    );
    downToken = new RebaseableTokenFactory(signers[0]).attach(
      await optionsPool.down()
    );

    timelock = await deploy<Timelock>(
      "Timelock",
      lucerneAddr,
      time.duration.days(2),
      checkToken.address
    );

    const permissions = {
      canPauseSwapping: false,
      canChangeSwapFee: false,
      canChangeWeights: true,
      canAddRemoveTokens: false,
      canWhitelistLPs: false,
      canChangeCap: false,
    };

    // alice will create this factory
    const factory = await ethers.getContractFactory("ESBalancerPool", {
      signer: lucerne,
      libraries: {
        BalancerSafeMath: "0xCfE28868F6E0A24b7333D22D8943279e76aC2cdc",
        RightsManager: "0x0F811b1AF2B6B447B008eFF31eCceeE5A0b1d842",
        SmartPoolManager: "0xA3F9145CB0B50D907930840BB2dcfF4146df8Ab4",
      },
    });

    const swapFee = 10 ** 15;

    const startWeights = [oneEth.mul(20), oneEth.mul(20)];

    // one payoutToken of liquidity
    const startBalances = [oneEth.mul(100), oneEth.mul(100)];

    const poolParams = {
      poolTokenSymbol: "UpDnTest15min",
      poolTokenName: "Up Down Test up/down pairs",
      constituentTokens: [upToken.address, downToken.address],
      tokenBalances: startBalances,
      tokenWeights: startWeights,
      swapFee: swapFee,
    };
    const instance = await factory.deploy(
      "0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd",
      poolParams,
      permissions
    );
    await instance.deployed();
    esPool = (instance as any) as EsBalancerPool;

    // lucerne deposits 1 payout token
    await payoutToken.connect(lucerne).approve(optionsPool.address, oneEth);
    await optionsPool.connect(lucerne).deposit(oneEth);

    // lucerne approves her oneEth of liquidity:
    await upToken.connect(lucerne).approve(esPool.address, oneEth.mul(100));
    await downToken.connect(lucerne).approve(esPool.address, oneEth.mul(100));

    // now they create the pool with their oneEth of liquidity
    await esPool.connect(lucerne)["createPool(uint256)"](oneEth.mul(100));

    await optionsPool.setESPool(esPool.address);
    // transfer ownership to the optionsPool
    await esPool.setController(optionsPool.address);
    const poolAddr = await esPool.bPool();
    bpool = IFullBPoolFactory.connect(poolAddr, lucerne);

    // now lucerne is going to transfer ownership of the pool to the timelock
    await optionsPool.setOwner(timelock.address);
  });

  it("end to end test", async () => {
    // lucerne adds the balancer pool to the listed rewards pools
    // these are the pools that Queen rewards.
    await queen.add("100", esPool.address, true);

    // now rich alice is gonna come along and depsoit 100 payoutToken
    await payoutToken
      .connect(alice)
      .approve(optionsPool.address, oneEth.mul(100));
    await optionsPool.connect(alice).deposit(oneEth.mul(100));

    // and now alice is going to go stake her ups and downs
    await downToken.connect(alice).approve(esPool.address, oneEth.mul(10000));
    await upToken.connect(alice).approve(esPool.address, oneEth.mul(10000));

    await esPool.connect(alice).joinPool(oneEth.mul(100), [oneEth.mul(101), oneEth.mul(101)]);
    // let's see alice's LP balance
    const aliceBal = await esPool.balanceOf(aliceAddr)
    expect(aliceBal).to.equal(oneEth.mul(100))
    // console.log("bpool alice: ", utils.formatEther(aliceBal), "up alice: ", utils.formatEther(await upToken.balanceOf(aliceAddr)))

    // awesome - now she's gonna go earn some sweet sweet CHK tokens
    await esPool.connect(alice).approve(queen.address, aliceBal)
    //make sure we're still before the start block
    expect(await ethers.provider.getBlockNumber()).to.be.lessThan(startBlock + 100)
    // depsoit the whole thing
    await queen.connect(alice).deposit(0, aliceBal)

    // now lets fast forward to the block where rewards start!
    await time.advanceBlockTo(ethers.provider, startBlock + 101)

    // alice should own some chk!
    const pending = await queen.pendingChk(0, aliceAddr)
    expect(pending).to.equal(oneEth.mul(100))

    // // bob is gonna come in here and deposit some cash
    await payoutToken.connect(bob).approve(optionsPool.address, oneEth.mul(100))
    await optionsPool.connect(bob).deposit(oneEth.mul(100))

    // and then he's gonna settle and liquidate
    await optionsPool.connect(bob).settle()
    await optionsPool.connect(bob).liquidate()

    // now the timelock contract should own 1 basis point of bob's payoutToken
    expect(await payoutToken.balanceOf(timelock.address)).to.equal(oneEth.mul(100).div(1000))
  });
});
