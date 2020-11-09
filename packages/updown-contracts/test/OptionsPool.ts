import { ethers, waffle } from "hardhat";
import { utils, BigNumber, Signer, ContractTransaction } from "ethers";
import { expect } from "chai";
import ERC20PresetArtifact from '@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json'
import { OptionsPool } from "../types/ethers-contracts/OptionsPool";
import { RebaseableToken } from "../types/ethers-contracts/RebaseableToken";
import { RebaseableTokenFactory } from "../types/ethers-contracts/RebaseableTokenFactory";
import { DevOracle } from "../types/ethers-contracts/DevOracle";
import { Erc20PresetMinterPauser } from "../types/ethers-contracts/Erc20PresetMinterPauser";
import { time } from "./helpers/time";
const { deployContract } = waffle
import {deploy} from './helpers/deployer'

const oneEth = utils.parseUnits("1", "ether");

describe("OptionsPool", async () => {
  let payoutToken: Erc20PresetMinterPauser;
  let upToken: RebaseableToken;
  let downToken: RebaseableToken;
  let optionsPool: OptionsPool;
  let oracle: DevOracle;

  let operator: Signer;
  let operatorAddr: string;

  let alice: Signer;
  let aliceAddr: string;

  let bob: Signer;
  let bobAddr: string;

  const underlyingAddress = "0x0000000000000000000000000000000000000000";

  beforeEach(async () => {
    const signers = await ethers.getSigners();

    operator = signers[0];
    operatorAddr = await operator.getAddress();

    alice = signers[1];
    aliceAddr = await alice.getAddress();

    bob = signers[2];
    bobAddr = await bob.getAddress();

    oracle = await deploy<DevOracle>("DevOracle")

    await oracle.setPrice(underlyingAddress, 100);

    payoutToken = (await deployContract(
      signers[0],
      ERC20PresetArtifact,
      ["FakeDai", "tDai"]
    )) as Erc20PresetMinterPauser;

    await payoutToken.mint(aliceAddr, utils.parseUnits("1000", "ether"));
    await payoutToken.mint(bobAddr, utils.parseUnits("1000", "ether"));

    optionsPool = await deploy<OptionsPool>("OptionsPool")
  
    await optionsPool.initialize(
      await signers[0].getAddress(),
      payoutToken.address,
      1,
      1,
      oracle.address,
      underlyingAddress
    );

    upToken = new RebaseableTokenFactory(signers[0]).attach(
      await optionsPool.up()
    );
    downToken = new RebaseableTokenFactory(signers[0]).attach(
      await optionsPool.down()
    );
    expect(upToken.address).to.not.equal(downToken.address);
  });

  it('mints', async ()=> {
    const oneMil = utils.parseEther('1000000')
    await payoutToken.mint(aliceAddr, oneMil)
    const initialBalance = await payoutToken.balanceOf(aliceAddr)
    await payoutToken.connect(alice).approve(optionsPool.address, oneMil)
    await optionsPool.connect(alice).deposit(oneMil)

    const newBalance = await payoutToken.balanceOf(aliceAddr)

    expect(initialBalance.sub(newBalance)).to.equal(oneMil)
    expect(await payoutToken.balanceOf(optionsPool.address)).to.equal(oneMil)
    expect(await upToken.balanceOf(aliceAddr)).to.equal(BigNumber.from(oneMil).mul(100))
    expect(await downToken.balanceOf(aliceAddr)).to.equal(BigNumber.from(oneMil).mul(100))
    expect(await downToken.totalSupply()).to.equal(BigNumber.from(oneMil).mul(100))
    expect(await downToken.balanceOf(aliceAddr)).to.equal(BigNumber.from(oneMil).mul(100))
  })

  it('adjusts up on price change', async ()=> {
    await payoutToken.connect(alice).approve(optionsPool.address, 1000)
    await optionsPool.connect(alice).deposit(1000)

    await oracle.setPrice(underlyingAddress,110)
    const resp = await optionsPool.testForEnd()

    // console.log("gas used " + (await resp.wait()).gasUsed.toString())

    expect(await upToken.balanceOf(aliceAddr)).to.equal(ethers.BigNumber.from(110000))
    expect(await downToken.balanceOf(aliceAddr)).to.equal(ethers.BigNumber.from(90000))
  })

  it('adjusts down on price change', async ()=> {
    await payoutToken.connect(alice).approve(optionsPool.address, 1000)
    await optionsPool.connect(alice).deposit(1000)

    await oracle.setPrice(underlyingAddress,90)
    await optionsPool.testForEnd()

    expect(await downToken.balanceOf(aliceAddr)).to.equal(ethers.BigNumber.from(110000))
    expect(await upToken.balanceOf(aliceAddr)).to.equal(ethers.BigNumber.from(90000))
  })

  it('does not adjust total if you just hold', async ()=> {
    //  in this scenario someone is issued options, but just keeps 'em
    // even if the price changes up and down with big swings, their initial investment should be safe.
    const initialBalance = await payoutToken.balanceOf(aliceAddr)
    // async function loggyLog() {
    //   const ups = await upToken.balanceOf(aliceAddr)
    //   const downs = await downToken.balanceOf(aliceAddr)
    //   console.log(utils.formatEther(ups))
    //   console.log(utils.formatEther(downs))
    //   console.log("alice is due: ", utils.formatEther(ups.add(downs).div(200)))
    // }

    await oracle.setPrice(underlyingAddress,60)
    await optionsPool.testForEnd()

    await oracle.setPrice(underlyingAddress,80)
    await optionsPool.testForEnd()

    await payoutToken.connect(alice).approve(optionsPool.address, oneEth.mul(1000))
    await optionsPool.connect(alice).deposit(oneEth.mul(1000))

    expect(await upToken.balanceOf(aliceAddr)).to.equal(oneEth.mul(1000).mul(100))
    expect(await downToken.balanceOf(aliceAddr)).to.equal(oneEth.mul(1000).mul(100))

    await oracle.setPrice(underlyingAddress,60)
    await optionsPool.testForEnd()
    // await loggyLog()

    await oracle.setPrice(underlyingAddress,80)
    await optionsPool.testForEnd()
    // await loggyLog()

    await oracle.setPrice(underlyingAddress,90)
    await optionsPool.testForEnd()
    // await loggyLog()

    await oracle.setPrice(underlyingAddress,100)
    await optionsPool.testForEnd()
    // await loggyLog()

    await oracle.setPrice(underlyingAddress,80)
    await optionsPool.testForEnd()
    // await loggyLog()

    await optionsPool.connect(alice).settle()
    // await loggyLog()

    await oracle.setPrice(underlyingAddress,80)
    await optionsPool.testForEnd()
    // await loggyLog()

    await optionsPool.connect(alice).liquidate()

    const afterBalance = await payoutToken.balanceOf(aliceAddr)
    const inEth = parseFloat(utils.formatEther(initialBalance.sub(afterBalance)))
    expect(inEth).to.be.closeTo(1, 0.00001)
  })

  it('handles the pathological case of an ever increasing asset', async ()=> {
    //  in this scenario someone is issued options, but just keeps 'em
    // even if the price changes up and down with big swings, their initial investment should be safe.
    await payoutToken.connect(alice).approve(optionsPool.address, oneEth)
    await optionsPool.connect(alice).deposit(oneEth)

    let current = 100;
    const upIt = async (percent:number) => {
      const newPrice = Math.trunc(current * (1 + percent));
      await oracle.setPrice(underlyingAddress,newPrice)
      await optionsPool.testForEnd()
      // console.log("up: ", (await upToken.balanceOf(aliceAddr)).toString(), "down: ", (await downToken.balanceOf(aliceAddr)).toString())
      current = newPrice;
    }

    for (let i = 0; i < 20; i++) {
      await upIt(0.1);
    }

    await optionsPool.connect(alice).settle()
    await oracle.setPrice(underlyingAddress,current)
    await optionsPool.testForEnd()

    const resp = await optionsPool.connect(alice).liquidate()

    const aliceBal = await payoutToken.balanceOf(aliceAddr)
    const diff = BigNumber.from(1000).mul(oneEth).sub(aliceBal)
    expect(diff.toNumber()).to.be.closeTo(oneEth.div(1000).toNumber(), 10) // this is the *wei* slippage from 1 eth
  })

  it('handles pathological price increases', async ()=> {
    const price = BigNumber.from('2927444456763740')

    await payoutToken.connect(alice).approve(optionsPool.address, oneEth)
    await optionsPool.connect(alice).deposit(oneEth)

    await oracle.setPrice(underlyingAddress,price)
    await optionsPool.testForEnd()

    // console.log("up: ", utils.formatEther(await upToken.balanceOf(aliceAddr)), "down: ", utils.formatEther(await downToken.balanceOf(aliceAddr)))

    await optionsPool.connect(alice).settle()
    await oracle.setPrice(underlyingAddress,price)
    await optionsPool.testForEnd()

    const resp = await optionsPool.connect(alice).liquidate()

    const aliceBal = await payoutToken.balanceOf(aliceAddr)
    const diff = BigNumber.from(1000).mul(oneEth).sub(aliceBal)
    expect(diff.toNumber()).to.be.closeTo(oneEth.div(1000).toNumber(), 10) // this is the *wei* slippage from 1 eth
  })

  it('sends a fee to the owner', async ()=> {
    await payoutToken.connect(alice).approve(optionsPool.address, oneEth)
    await optionsPool.connect(alice).deposit(oneEth)

    await optionsPool.connect(alice).settle()
    await oracle.setPrice(underlyingAddress,100)
    await optionsPool.testForEnd()

    const resp = await optionsPool.connect(alice).liquidate()

    expect(await payoutToken.balanceOf(operatorAddr)).to.equal(oneEth.div(1000));
  })

  it('can make money for an active trader', async ()=> {
    await payoutToken.connect(alice).approve(optionsPool.address, oneEth)
    await optionsPool.connect(alice).deposit(oneEth)

    await payoutToken.connect(bob).approve(optionsPool.address, oneEth)
    await optionsPool.connect(bob).deposit(oneEth)

    // alice thinks the price is going up 10% and bob thinks it's going down, so they are gonna trade.
    await Promise.all([
      downToken.connect(alice).transfer(bobAddr, oneEth.mul(100)),
      upToken.connect(bob).transfer(aliceAddr, oneEth.mul(100)),
    ])

    expect(await downToken.balanceOf(aliceAddr)).to.equal(0)
    expect(await upToken.balanceOf(bobAddr)).to.equal(0)

    // now alice has 200k up and bob has 200k down
    // bob's gonna lose this one.
    await oracle.setPrice(underlyingAddress,110)
    await optionsPool.testForEnd()

    // // alice is happy!
    // expect(await upToken.balanceOf(aliceAddr)).to.equal(oneEth.mul(2).mul(12).div(10).mul(100))

    // // bob is not!
    // expect(await downToken.balanceOf(bobAddr)).to.equal(oneEth.mul(2).mul(8).div(10).mul(100))

    await optionsPool.connect(alice).settle()
    await optionsPool.connect(bob).settle()

    // keep the price the same, but advance the epoch.
    await oracle.setPrice(underlyingAddress,110)
    await optionsPool.testForEnd()

    // alice made 1.1
    await optionsPool.connect(alice).liquidate()
    // bob gets back 0.9
    await optionsPool.connect(bob).liquidate()

    // do one more epoch after this liquidation
    await optionsPool.testForEnd()

    const expectCloseTo = (expected:BigNumber, actual:BigNumber, range:number) => {
      const diff = expected.sub(actual)
      expect(diff.div(expected).toNumber()).to.be.closeTo(range, range)
    }

    const expectedAlicePayout = oneEth.add(oneEth.mul(100).div(110).div(10))
    const fee = expectedAlicePayout.div(1000)
    const expectedAliceTotal = expectedAlicePayout.sub(fee)

    const expectedBobPayout = oneEth.sub(oneEth.mul(110).div(100).div(10))
    const expectedBobTotal = expectedBobPayout.sub(expectedBobPayout.div(1000))

    expectCloseTo(oneEth.mul(999).add(expectedBobTotal), await payoutToken.balanceOf(bobAddr), 0.00001)

    expectCloseTo(oneEth.mul(999).add(expectedAliceTotal), await payoutToken.balanceOf(aliceAddr), 0.00001)
  })

  it('respects multiplier', async ()=> {
    // re-deploying the options pool because we want 10 block epochs instead of single block epochs
    // for this test
    const OptionsPoolFactory = await ethers.getContractFactory("OptionsPool")
    optionsPool = await OptionsPoolFactory.deploy() as OptionsPool
    await optionsPool.deployed()

    await oracle.setPrice(underlyingAddress,100)

    await optionsPool.initialize(
      operatorAddr,
      payoutToken.address,
      1,
      2, // 2x multiplier!
      oracle.address,
      underlyingAddress,
    )

    downToken = RebaseableTokenFactory.connect(await optionsPool.down(), alice)
    upToken = RebaseableTokenFactory.connect(await optionsPool.up(), alice)

    await payoutToken.connect(alice).approve(optionsPool.address, oneEth)
    await optionsPool.connect(alice).deposit(oneEth)

    await payoutToken.connect(bob).approve(optionsPool.address, oneEth)
    await optionsPool.connect(bob).deposit(oneEth)

    // alice thinks the price is going up 10% and bob thinks it's going down, so they are gonna trade.
    await Promise.all([
      downToken.connect(alice).transfer(bobAddr, oneEth.mul(100)),
      upToken.connect(bob).transfer(aliceAddr, oneEth.mul(100)),
    ])

    expect(await downToken.balanceOf(aliceAddr)).to.equal(0)
    expect(await upToken.balanceOf(bobAddr)).to.equal(0)

    // now alice has 200k up and bob has 200k down
    // bob's gonna lose this one.
    await oracle.setPrice(underlyingAddress,110)
    await optionsPool.testForEnd()

    // alice is happy!
    expect(await upToken.balanceOf(aliceAddr)).to.equal(oneEth.mul(2).mul(12).div(10).mul(100))

    // bob is not!
    expect(await downToken.balanceOf(bobAddr)).to.equal(oneEth.mul(2).mul(8).div(10).mul(100))

    await optionsPool.connect(alice).settle()

    // keep the price the same, but advance the epoch.
    await oracle.setPrice(underlyingAddress,110)
    await optionsPool.testForEnd()

    // alice made 1.2
    await optionsPool.connect(alice).liquidate()

    // minus the fee
    const payout = oneEth.add(oneEth.mul(2).div(10))
    const fee = payout.div(1000)

    expect(await payoutToken.balanceOf(aliceAddr)).to.equal(oneEth.mul(999).add(payout.sub(fee)))
  })

  describe("settlements", () => {
    const expectRevert = async (txPromise:Promise<ContractTransaction>)=>{
      txPromise.then((resp)=> {
        expect([resp, "this should never happen"]).to.equal(false)
      }).catch((err)=> {
        expect(err.message).to.include('revert')
      })
      return
    }

    const goToNextEpoch = async ()=> {
      const currEpoch = await optionsPool.epoch()
      const start = await optionsPool.epochStart()
      const length = await optionsPool.epochLength()
      const blk = start.add(length)
      await time.advanceBlockTo(ethers.provider, blk)
      await optionsPool.testForEnd()
      expect(await optionsPool.epoch()).to.equal(currEpoch.add(1))
    }

    beforeEach(async () => {
      // re-deploying the options pool because we want 10 block epochs instead of single block epochs
      // for this test
      const OptionsPoolFactory = await ethers.getContractFactory("OptionsPool")
      optionsPool = await OptionsPoolFactory.deploy() as OptionsPool
      await optionsPool.deployed()

      await optionsPool.initialize(
        operatorAddr,
        payoutToken.address,
        10,
        1,
        oracle.address,
        underlyingAddress
      );

      await payoutToken.connect(alice).approve(optionsPool.address, oneEth);
      await optionsPool.connect(alice).deposit(oneEth);
    });

    it("prevents deposits before liquidation", async () => {
      await (await optionsPool.connect(alice).settle()).wait()

      await payoutToken.connect(alice).approve(optionsPool.address, oneEth);
      expectRevert(optionsPool.connect(alice).deposit(oneEth))
      await goToNextEpoch()
      await optionsPool.connect(alice).liquidate()
      // this would throw an error if not allowed:
      await optionsPool.connect(alice).deposit(oneEth)
    });

    it("prevents liquidations before next epoch", async () => {
      await (await optionsPool.connect(alice).settle()).wait()

      expectRevert(optionsPool.connect(alice).liquidate())
      await goToNextEpoch()
      // no error here:
      await optionsPool.connect(alice).liquidate()
    });
  });
});
