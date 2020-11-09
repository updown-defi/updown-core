import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { utils, Signer, BigNumberish, BigNumber } from "ethers";

import ERC20PresetArtifact from '@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json'
import { OptionsPool } from '../../types/ethers-contracts/OptionsPool'
import { RebaseableToken } from '../../types/ethers-contracts/RebaseableToken'
import { RebaseableTokenFactory } from '../../types/ethers-contracts/RebaseableTokenFactory'
import { DevOracle } from '../../types/ethers-contracts/DevOracle'
import { Erc20PresetMinterPauser } from '../../types/ethers-contracts/Erc20PresetMinterPauser'

const { deployContract } = waffle
import {deploy} from '../helpers/deployer'

const oneEth = utils.parseUnits("1", 'ether')
const zero = BigNumber.from('0')

interface SignerPair {
    signer: Signer,
    addr: string,
}

describe("MultiplayerSimulation", async () => {
  let payoutToken: Erc20PresetMinterPauser

  let upToken: RebaseableToken
  let downToken: RebaseableToken
  let optionsPool: OptionsPool
  let oracle:DevOracle

  let signers:SignerPair[] = []
  
  const underlyingAddress = '0x0000000000000000000000000000000000000000'

  beforeEach(async () => {
    const ethersSigners = await ethers.getSigners();

    for (let i = 0; i <= 6; i += 1) {
        signers[i] = {
            signer: ethersSigners[i],
            addr: await ethersSigners[i].getAddress(),
        }
    }
    
    const operator = signers[0].signer

    oracle = await deploy<DevOracle>("DevOracle")

    await oracle.setPrice(underlyingAddress, 100)

    payoutToken = await (deployContract(
      operator,
      ERC20PresetArtifact,
      ["FakeDai", "tDai"],
    )) as Erc20PresetMinterPauser

    await payoutToken.mint(signers[0].addr, utils.parseUnits("800000", 'ether'))
    optionsPool = await deploy<OptionsPool>("OptionsPool")

    await optionsPool.initialize(
      signers[0].addr, 
      payoutToken.address, 
      1,
      1,
      oracle.address,
      underlyingAddress, // fake address of underlying
    )
    upToken = new RebaseableTokenFactory(signers[0].signer).attach(await optionsPool.up())
    downToken = new RebaseableTokenFactory(signers[0].signer).attach(await optionsPool.down())
    
    await payoutToken.connect(operator).approve(optionsPool.address, oneEth.mul(800000))
    await optionsPool.connect(operator).deposit(oneEth.mul(800000))

    const bal = utils.parseUnits("100000", 'ether')
    for (let i = 0; i < signers.length; i+= 1) {
        await payoutToken.mint(signers[i].addr, bal)
        await payoutToken.connect(signers[i].signer).approve(optionsPool.address, bal)
        await (await optionsPool.connect(signers[i].signer).deposit(bal)).wait()
    }
  });

  // previous bad seeds: 
  // 1602146143206
  // 1603194974848
  // 1603374178828
  // 1604413123239

  it('works swapping tokens', async ()=> {
    let seed = (new Date()).getTime()
    console.log("test seed: ", seed)
    // see: https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
    function random() {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    function randomChunk(num:BigNumberish) {
        if (!BigNumber.isBigNumber(num)) {
            num = BigNumber.from(num.toString())
        }
        return num.mul((Math.floor(random() * 10**18)).toString()).div((10**18).toString())
    }

    let currentPrice = 100
    async function setRandomPrice() {
        const isDecrease = random() <= 0.5
        const bigSwingDivider = (random() < 0.1) ? 2 : 10 // 10% chance of a big swing
        const percentChange = random() / bigSwingDivider // single digit percentage differences usually, sometimes a big swing
    
        let diff = currentPrice * percentChange
        if (isDecrease) {
            diff = diff * -1
        }
        const newPrice = Math.floor(currentPrice + diff)
        // console.log("--new price: ", newPrice)
        await oracle.setPrice(underlyingAddress, newPrice)
        currentPrice = newPrice
        return optionsPool.testForEnd()
    }

    async function testBalances() {
        let total = BigNumber.from('0')
        const poolBal = await payoutToken.balanceOf(optionsPool.address)

        for (let i = 0; i < signers.length; i++) {
            const signer = signers[i]

            const upBalance = await upToken.balanceOf(signer.addr)
            const downBalance = await downToken.balanceOf(signer.addr)
            // console.log(`--balance (${signer.addr}): `, utils.formatEther(upBalance), utils.formatEther(downBalance))

            total = total.add(upBalance).add(downBalance)
        }
        // console.log("total: ", utils.formatEther(total.div(200)), " pool: ", utils.formatEther(poolBal))
        // console.log("total: ", total.div(200).toString(), " pool: ", poolBal.toString())
        // if (total.div(200).gt(poolBal)) {
        //     for (let i = 0; i < signers.length; i++) {
        //         const signer = signers[i]
                
        //         const upBalance = await upToken.balanceOf(signer.addr)
        //         const downBalance = await downToken.balanceOf(signer.addr)
        //         console.log(`--balance (${signer.addr}): `, utils.formatEther(upBalance), utils.formatEther(downBalance))
        //     }
        // }

        expect(total.div(200).sub(poolBal).toNumber()).to.be.within(-100, 100)
    }

    let settlements:{[key:number]:boolean} = {}
    
    function randomUnsettledSigner() {
        if (Object.keys(settlements).length == signers.length) {
            return null
        }
        let rnd = Math.floor(random() * 6) + 1
        while (settlements[rnd]) {
            rnd = Math.floor(random() * 6) + 1
        }
        return signers[ rnd ]
    }

    async function randomTrades() {
        for (let i = 1; i <= 6; i++) {
            const signer = signers[i]
            if (settlements[i]) {
                // this trader already has a settlement
                // 40% chance of liquidating
                if (random() <= 0.4) {
                    await optionsPool.connect(signer.signer).liquidate()
                    settlements[i] = false
                }
                continue
            }

            const upBalance = await upToken.balanceOf(signer.addr)
            const downBalance = await downToken.balanceOf(signer.addr)

            // 10% chance of settling
            if (random() < 0.1) {
                // console.log(`--signer ${i} settling: `, utils.formatEther(upBalance), utils.formatEther(downBalance))
                await(await optionsPool.connect(signer.signer).settle()).wait()
                settlements[i] = true
                continue
            }
            
            const payoutTokenBalance = await payoutToken.balanceOf(signer.addr)
            if (payoutTokenBalance.gt(zero)) {
                // if the signer has a balance, give it a 10% chance of putting it back into the pool
                if (random() < 0.1) {
                    await payoutToken.connect(signer.signer).approve(optionsPool.address, payoutTokenBalance)
                    await optionsPool.connect(signer.signer).deposit(payoutTokenBalance)
                }   
            }
            // otherwise go ahead and trade
            const randomUp = randomUnsettledSigner()
            const randomDown = randomUnsettledSigner()

            const randomUpAmt = randomChunk(upBalance)
            const randomDownAmt = randomChunk(downBalance)
            if (randomUp) {
                await upToken.connect(signer.signer).transfer(randomUp.addr, randomUpAmt)
            }
            if (randomDown) {
                await downToken.connect(signer.signer).transfer(randomDown.addr, randomDownAmt)
            }
        }
        return
    }

    const operator = signers[0]

    // console.log("alice up: ", utils.formatEther(await upToken.balanceOf(alice.addr)))

    // console.log('--starting')
    for (let i = 0; i < 30; i++) {
        await randomTrades()
        await setRandomPrice()
        await testBalances()
    }

    // we'll settle on the huge operator pool
    await optionsPool.connect(operator.signer).settle()

    // now we'll keep playing

    for (let i = 0; i < 30; i++) {
        await randomTrades()
        await setRandomPrice()
        await testBalances()
    }

    // now we'll settle everyone
    // console.log("--settling")
    for (let i = 1; i < signers.length; i+= 1) {
        if (!settlements[i]) {
            await (await optionsPool.connect(signers[i].signer).settle()).wait()
        }
    }
    await optionsPool.testForEnd()
    // and now we'll liquidate
    for (let i = 0; i < signers.length; i+= 1) {
        await (await optionsPool.connect(signers[i].signer).liquidate()).wait()
    }
    

    return
  }).timeout(240000)

})
