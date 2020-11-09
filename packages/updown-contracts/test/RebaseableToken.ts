import { ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { expect } from "chai";
import { RebaseableToken } from '../types/ethers-contracts/RebaseableToken'
import {deploy} from './helpers/deployer'

describe("RebaseableToken", async () => {
  let token: RebaseableToken;

  const decimals = BigNumber.from(10).pow(18)

  let operator:Signer
  let operatorAddr:string

  let alice:Signer
  let aliceAddr:string

  let bob:Signer
  let bobAddr:string
  
  beforeEach(async () => {
    const signers = await ethers.getSigners();

    operator = signers[0]
    operatorAddr = await operator.getAddress()

    alice = signers[1]
    aliceAddr = await alice.getAddress()

    bob = signers[2]
    bobAddr = await bob.getAddress()

    token = await deploy<RebaseableToken>("RebaseableToken")
    await token.initialize("UpToken", "UpDnUp", operatorAddr)
  });

  it('works with 1000000 tokens',  async ()=> {
    const mintAmount = BigNumber.from(1000000).mul(decimals).mul(100)
    await token.mint(bobAddr, mintAmount)
    const total = await token.totalSupply()
    expect(total).to.equal(mintAmount)
  })


  it('adjusts multiplier by upPercentage', async ()=> {
    const mintAmount = BigNumber.from(100).mul(decimals)
    await token.mint(bobAddr, mintAmount)

    const total = await token.totalSupply()
    const adjust = total.mul(10).div(100)

    await token.rebase(0, adjust)

    expect(await token.balanceOf(bobAddr)).to.equal(BigNumber.from(110).mul(decimals).toString())
  })

  it('adjusts multiplier by downPercentage', async ()=> {
    const mintAmount = BigNumber.from(100).mul(decimals)
    await token.mint(bobAddr, mintAmount)

    const total = await token.totalSupply()
    const adjust = total.mul(10).div(100).mul(-1)
    await token.rebase(0, adjust) // down 10%

    expect(await token.balanceOf(bobAddr)).to.equal(BigNumber.from(90).mul(decimals).toString())
  })

  it('approves using the multiplier', async ()=> {
    const mintAmount = BigNumber.from(100).mul(decimals)
    await token.mint(bobAddr, mintAmount)

    const total = await token.totalSupply()
    const adjust = total.mul(30).div(100)

    await token.rebase(0, adjust)
    
    expect(await token.balanceOf(bobAddr)).to.equal(BigNumber.from(130).mul(decimals))

    const approvResp = await token.connect(bob).approve(aliceAddr, BigNumber.from(130).mul(decimals))
    await approvResp.wait()
    expect (await token.allowance(bobAddr, aliceAddr)).to.equal(BigNumber.from(130).mul(decimals))

    await token.connect(alice).transferFrom(bobAddr, aliceAddr, BigNumber.from(130).mul(decimals))
    expect(await token.balanceOf(bobAddr)).to.equal(BigNumber.from(0))
    expect(await token.balanceOf(aliceAddr)).to.equal(BigNumber.from(130).mul(decimals))
  })

  it('liquidates', async ()=> {
    const mintAmount = BigNumber.from(100).mul(decimals)
    await token.mint(bobAddr, mintAmount)

    // simplifying by not adjusting
    await token.settle(bobAddr)
    await token.rebase(2, 0)

    await token.liquidate(bobAddr)
    expect(await token.balanceOf(bobAddr)).to.equal("0")

    // works after rebasing too
    await token.mint(bobAddr, mintAmount)

    const total = await token.totalSupply()
    const adjust = total.mul(30).div(100)
    await token.rebase(2, adjust) // up 30%
    await token.mint(bobAddr, mintAmount)

    await token.settle(bobAddr)
    await token.rebase(3, 0)

    expect(await token.balanceOf(bobAddr)).to.equal(mintAmount.mul(130).div(100).add(mintAmount)) // first one inflated 30% and then we added same amount

    await token.liquidate(bobAddr)
    expect(await token.balanceOf(bobAddr)).to.equal("0")
  })

})
