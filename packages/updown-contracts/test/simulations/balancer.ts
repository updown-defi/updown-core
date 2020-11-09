import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { utils, Signer, } from "ethers";

import ERC20PresetArtifact from '@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json'
import { OptionsPool } from '../../types/ethers-contracts/OptionsPool'
import { RebaseableToken } from '../../types/ethers-contracts/RebaseableToken'
import { RebaseableTokenFactory } from '../../types/ethers-contracts/RebaseableTokenFactory'
import { DevOracle } from '../../types/ethers-contracts/DevOracle'
import { Erc20PresetMinterPauser } from '../../types/ethers-contracts/Erc20PresetMinterPauser'
const { deployContract } = waffle
import {deploy} from '../helpers/deployer'
import { EsBalancerPool } from "../../types/ethers-contracts/EsBalancerPool";
import { IFullBPoolFactory } from "../../types/ethers-contracts/IFullBPoolFactory";

const oneEth = utils.parseUnits("1", 'ether')

describe("BalancerInteractions", async () => {
  let payoutToken: Erc20PresetMinterPauser

  let upToken: RebaseableToken
  let downToken: RebaseableToken
  let optionsPool: OptionsPool
  let esPool: EsBalancerPool
  let oracle:DevOracle

  let operator:Signer
  let operatorAddr:string

  let alice:Signer
  let aliceAddr:string

  let bob:Signer
  let bobAddr:string
  
  const underlyingAddress = '0x0000000000000000000000000000000000000000'

  beforeEach(async () => {
    const signers = await ethers.getSigners();

    operator = signers[0]
    operatorAddr = await operator.getAddress()

    alice = signers[1]
    aliceAddr = await alice.getAddress()

    bob = signers[2]
    bobAddr = await bob.getAddress()

    oracle = await deploy<DevOracle>("DevOracle")

    await oracle.setPrice(underlyingAddress, 100)

    payoutToken = await (deployContract(
      signers[0],
      ERC20PresetArtifact,
      ["FakeDai", "tDai"],
    )) as Erc20PresetMinterPauser

    await payoutToken.mint(aliceAddr, utils.parseUnits("1000", 'ether'))
    await payoutToken.mint(bobAddr, utils.parseUnits("1000", 'ether'))

    optionsPool = await deploy<OptionsPool>("OptionsPool")
    
    await optionsPool.initialize(
      await signers[0].getAddress(), 
      payoutToken.address, 
      1,
      1,
      oracle.address,
      underlyingAddress, // fake address of underlying
    )
    upToken = new RebaseableTokenFactory(signers[0]).attach(await optionsPool.up())
    downToken = new RebaseableTokenFactory(signers[0]).attach(await optionsPool.down())

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
        signer: alice,
        libraries: {
            "BalancerSafeMath": '0xCfE28868F6E0A24b7333D22D8943279e76aC2cdc',
            "RightsManager": '0x0F811b1AF2B6B447B008eFF31eCceeE5A0b1d842',
            "SmartPoolManager": '0xA3F9145CB0B50D907930840BB2dcfF4146df8Ab4',
        },
    })

    const swapFee = 10**15;

    const startWeights = [oneEth.mul(20), oneEth.mul(20)];

    // one payoutToken of liquidity
    const startBalances = [oneEth.mul(100), oneEth.mul(100)];

    const poolParams = {
        poolTokenSymbol: 'UpDnTest15min',
        poolTokenName: 'Up Down Test up/down pairs',
        constituentTokens: [upToken.address, downToken.address],
        tokenBalances: startBalances,
        tokenWeights: startWeights,
        swapFee: swapFee,
    }
    const instance = await factory.deploy('0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd', poolParams, permissions)
    await instance.deployed()
    esPool = (instance as any) as EsBalancerPool

    // alice deposits 1 payout token
    await payoutToken.connect(alice).approve(optionsPool.address, oneEth)
    await optionsPool.connect(alice).deposit(oneEth)

    // alice approves her oneEth of liquidity:
    await upToken.connect(alice).approve(esPool.address, oneEth.mul(100))
    await downToken.connect(alice).approve(esPool.address, oneEth.mul(100))

    // now she creates the pool with her oneEth of liquidity
    await esPool.connect(alice)["createPool(uint256)"](oneEth.mul(100))

    await optionsPool.setESPool(esPool.address)
  });

  it('resyncs balancer prices', async ()=> {
    // bob will come in here and deposit too
    await payoutToken.connect(bob).approve(optionsPool.address, oneEth)
    await optionsPool.connect(bob).deposit(oneEth)
    // now we're going to have some rebases

    // and now there are a few price iterations on the pool
    await oracle.setPrice(underlyingAddress, 150) // 50% increase
    await optionsPool.testForEnd()
    // console.log("alice: ", utils.formatEther(await upToken.balanceOf(aliceAddr)))

    await oracle.setPrice(underlyingAddress, 75) // 50% decreases
    await optionsPool.testForEnd()
    // console.log("alice: ", utils.formatEther(await upToken.balanceOf(aliceAddr)))

    await oracle.setPrice(underlyingAddress, 100) // return to beginning
    await optionsPool.testForEnd()

    // since nothing has changed in the market - we expect bob to still get 1 down for 1 up
    const poolAddr = await esPool.bPool()
    const bpool = IFullBPoolFactory.connect(poolAddr, operator)
    expect(await bpool.getSpotPriceSansFee(upToken.address, downToken.address)).to.equal(oneEth)

    // expect the balances of bob and balancer to be equal since they were both affected similarly
    expect(await upToken.balanceOf(bobAddr)).to.equal(await upToken.balanceOf(bpool.address))
  })

})
 