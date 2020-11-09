import { ethers } from "hardhat";
import { utils, Signer } from "ethers";
import { expect } from "chai";
import { deploy } from './helpers/deployer';
import { oneEth } from './helpers/numbers';
import { RebaseableToken } from "../types/ethers-contracts/RebaseableToken";
import { IFullBPoolFactory } from "../types/ethers-contracts/IFullBPoolFactory";
import { EsBalancerPool } from "../types/ethers-contracts/EsBalancerPool";

describe("ESBalancerPool", async () => {

    let operator: Signer
    let operatorAddr: string

    let alice: Signer
    let aliceAddr: string

    const permissions = {
        canPauseSwapping: false,
        canChangeSwapFee: false,
        canChangeWeights: true,
        canAddRemoveTokens: false,
        canWhitelistLPs: false,
        canChangeCap: false,
    };

    beforeEach(async () => {
        const signers = await ethers.getSigners();

        operator = signers[0]
        operatorAddr = await operator.getAddress()

        alice = signers[1]
        aliceAddr = await alice.getAddress()

    });

    it('it has wrong price without resync', async ()=> {
        const signers = await ethers.getSigners();
        const operator = signers[0]

        // const bfactory = await deploy<typeof BFactory>("BFactory")
        const factory = await ethers.getContractFactory("ESBalancerPool", {
            libraries: {
                "BalancerSafeMath": '0xCfE28868F6E0A24b7333D22D8943279e76aC2cdc',
                "RightsManager": '0x0F811b1AF2B6B447B008eFF31eCceeE5A0b1d842',
                "SmartPoolManager": '0xA3F9145CB0B50D907930840BB2dcfF4146df8Ab4',
            },
        })

        const swapFee = 10**15;

        const startWeights = [oneEth.mul(20), oneEth.mul(20)];

        const startBalances = [oneEth, oneEth];

        const ups = await deploy<RebaseableToken>("RebaseableToken")
        await ups.initialize("UpToken", "UpDnUp", operator.address)

        const downs = await deploy<RebaseableToken>("RebaseableToken")
        await downs.initialize("DownToken", "UpDnDn", operator.address)

        const poolParams = {
            poolTokenSymbol: 'UpDnTest15min',
            poolTokenName: 'Up Down Test up/down pairs',
            constituentTokens: [ups.address, downs.address],
            tokenBalances: startBalances,
            tokenWeights: startWeights,
            swapFee: swapFee,
        }

        // this is the core pool address from https://docs.balancer.finance/smart-contracts/addresses
        const instance = await factory.deploy('0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd', poolParams, permissions)

        await instance.deployed()
        const espool = (instance as any) as EsBalancerPool

        await ups.mint(operator.address, oneEth)
        await downs.mint(operator.address, oneEth)

        await ups.approve(espool.address, oneEth)
        await downs.approve(espool.address, oneEth)
        // console.log((await ups.totalSupply()).toString(), utils.parseUnits("-0.25", 'ether').toString())
        await espool["createPool(uint256)"](utils.parseUnits('100', 'ether'))

        const poolAddr = await espool.bPool()
        const bpool = IFullBPoolFactory.connect(poolAddr, operator)
        const initialSpotPrice = await bpool.getSpotPriceSansFee(ups.address, downs.address)

        await ups.rebase(0, utils.parseUnits("-0.25", 'ether'))
        await downs.rebase(0, utils.parseUnits("0.25", 'ether'))

        await bpool.gulp(ups.address)
        await bpool.gulp(downs.address)

        const afterRebaseSpotPrice = await bpool.getSpotPriceSansFee(ups.address, downs.address)
        expect(afterRebaseSpotPrice).to.not.equal(initialSpotPrice)
    });

    it('it has right price with resync', async ()=> {
        const signers = await ethers.getSigners();
        const operator = signers[0]

        // const bfactory = await deploy<typeof BFactory>("BFactory")
        const factory = await ethers.getContractFactory("ESBalancerPool", {
            libraries: {
                "BalancerSafeMath": '0xCfE28868F6E0A24b7333D22D8943279e76aC2cdc',
                "RightsManager": '0x0F811b1AF2B6B447B008eFF31eCceeE5A0b1d842',
                "SmartPoolManager": '0xA3F9145CB0B50D907930840BB2dcfF4146df8Ab4',
            },
        })

        const swapFee = 10**15;

        const startWeights = [oneEth.mul(10), oneEth.mul(10)];

        const startBalances = [oneEth, oneEth];

        const ups = await deploy<RebaseableToken>("RebaseableToken")
        await ups.initialize("UpToken", "UpDnUp", operator.address)

        const downs = await deploy<RebaseableToken>("RebaseableToken")
        await downs.initialize("DownToken", "UpDnDn", operator.address)

        const poolParams = {
            poolTokenSymbol: 'UpDnTest15min',
            poolTokenName: 'Up Down Test up/down pairs',
            constituentTokens: [ups.address, downs.address],
            tokenBalances: startBalances,
            tokenWeights: startWeights,
            swapFee: swapFee,
        }

        // this is the core pool address from https://docs.balancer.finance/smart-contracts/addresses
        const instance = await factory.deploy('0x9424B1412450D0f8Fc2255FAf6046b98213B76Bd', poolParams, permissions)

        await instance.deployed()
        const espool = (instance as any) as EsBalancerPool

        await ups.mint(operator.address, oneEth)
        await downs.mint(operator.address, oneEth)

        await ups.approve(espool.address, oneEth)
        await downs.approve(espool.address, oneEth)
        // console.log((await ups.totalSupply()).toString(), utils.parseUnits("-0.25", 'ether').toString())
        await espool["createPool(uint256)"](utils.parseUnits('100', 'ether'))

        const poolAddr = await espool.bPool()
        const bpool = IFullBPoolFactory.connect(poolAddr, operator)
        const initialSpotPrice = await bpool.getSpotPriceSansFee(ups.address, downs.address)

        await ups.rebase(0, utils.parseUnits("-0.25", 'ether'))
        await downs.rebase(0, utils.parseUnits("0.25", 'ether'))

        const beforeUps = await bpool.getBalance(ups.address)
        const beforeDowns = await bpool.getBalance(downs.address)

        await espool.resyncWeights(ups.address, downs.address)

        const afterUps = await bpool.getBalance(ups.address)
        const afterDowns = await bpool.getBalance(downs.address)

        expect(beforeUps).to.not.equal(afterUps)
        expect(beforeDowns).to.not.equal(afterDowns)

        const afterRebaseSpotPrice = await bpool.getSpotPriceSansFee(ups.address, downs.address)
        expect(afterRebaseSpotPrice).to.equal(initialSpotPrice)

    });


})