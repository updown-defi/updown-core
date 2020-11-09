import { ethers, waffle } from "hardhat";
import { Wallet, utils, Signer } from "ethers";
import { expect } from "chai";
import ERC20PresetArtifact from '@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json'

import { Faucet } from '../types/ethers-contracts/Faucet'
import { Erc20PresetMinterPauser } from '../types/ethers-contracts/Erc20PresetMinterPauser'
const { deployContract } = waffle;

describe("Faucet", async () => {
    const oneEth = utils.parseUnits("1", 'ether')

    let faucet: Faucet
    let payoutToken: Erc20PresetMinterPauser

    let operator: Signer
    let operatorAddr: string

    let alice: Signer
    let aliceAddr: string


    beforeEach(async () => {
        const signers = await ethers.getSigners();

        operator = signers[0]
        operatorAddr = await operator.getAddress()

        alice = signers[1]
        aliceAddr = await alice.getAddress()

        payoutToken = await (deployContract(
            <Wallet>operator,
            ERC20PresetArtifact,
            ["faucetCoin", "fc"],
        )) as Erc20PresetMinterPauser

        const Faucet = await ethers.getContractFactory("Faucet")
        faucet = (await Faucet.deploy(payoutToken.address)) as Faucet
        await faucet.deployed()

        await payoutToken.mint(faucet.address, oneEth.mul(100))
    });

    it('adds codes and cashes in', async ()=> {
        await faucet.addCode(utils.solidityKeccak256(["string"], ["my secret code"]), oneEth)
        await faucet.connect(alice).cashIn("my secret code", aliceAddr)
        expect(await payoutToken.balanceOf(aliceAddr)).to.equal(oneEth)
    });


})