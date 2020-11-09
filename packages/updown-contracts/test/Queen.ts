import { ethers, waffle } from "hardhat";
import { utils, Signer } from "ethers";
import { expect } from "chai";
import ERC20PresetArtifact from '@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json'

import { Queen } from '../types/ethers-contracts/Queen'
import { Erc20PresetMinterPauser } from '../types/ethers-contracts/Erc20PresetMinterPauser'
import { CheckToken } from '../types/ethers-contracts/CheckToken'
import { time } from "./helpers/time";
import {deploy} from './helpers/deployer'
const { deployContract } = waffle

describe("Queen", async () => {
    const oneEth = utils.parseUnits("1", 'ether')

    let chk: CheckToken
    let uniswap: Erc20PresetMinterPauser
    let queen: Queen

    let operator: Signer
    let operatorAddr: string

    let alice: Signer
    let aliceAddr: string

    let bob: Signer
    let bobAddr: string

    let relativeStart = 0
    const relativeForward = async (amount:number)=> {
        await time.advanceBlockTo(ethers.provider, relativeStart + amount);
    }

    beforeEach(async () => {
        const signers = await ethers.getSigners();

        operator = signers[0]
        operatorAddr = await operator.getAddress()

        alice = signers[1]
        aliceAddr = await alice.getAddress()

        bob = signers[2]
        bobAddr = await bob.getAddress()

        uniswap = await (deployContract(
            operator,
            ERC20PresetArtifact,
            ["uniswap", "uni"],
        )) as Erc20PresetMinterPauser

        chk = await deploy<CheckToken>("CheckToken")
      
        /**
         * little bit of sorcery here, the blockchain only starts per test
         * so we want the queen to start 100 blocks in the future from right after setup
         * there is a  transaction involved in the setup so it starts
         * 101 blocks from startBlock below and then we set the relativeStart
         * to current right after that.
         * That lets the tests move from 0 being the epoch of the test rather than
         * the blockchain itself.
         */
        const startBlock = await ethers.provider.getBlockNumber()
        queen = await deploy<Queen>("Queen", chk.address, 100, startBlock + 101, startBlock + 501)
        relativeStart = await ethers.provider.getBlockNumber()

        await chk.transferOwnership(queen.address)
        await uniswap.mint(aliceAddr, oneEth)
    });

    it('provides pending CHKs', async ()=> {
        await uniswap.connect(alice).approve(queen.address, oneEth)

        await queen.add('100', uniswap.address, true);
        await uniswap.connect(alice).approve(queen.address, '1000');
        await queen.connect(alice).deposit(0, '100');

        await relativeForward(101);

        expect(await queen.pendingChk(0, aliceAddr)).to.equal(100)

        await queen.connect(alice).deposit(0, '0'); // block 102
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal(200)

        await relativeForward(104);
        expect(await queen.pendingChk(0, aliceAddr)).to.equal(200) // because already harvested

        await queen.connect(alice).deposit(0, '0'); // block 105
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal('500')
        expect((await chk.totalSupply()).valueOf()).to.equal('500')
    })

    it('should give out CHKs only after farming time', async () => {        
        await uniswap.connect(alice).approve(queen.address, oneEth)

        await queen.add('100', uniswap.address, true);
        await uniswap.connect(alice).approve(queen.address, '1000');
        await queen.connect(alice).deposit(0, '100');

        await relativeForward(89);
        await queen.connect(alice).deposit(0, '0'); // block 90
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal('0')

        await relativeForward(94);
        await queen.connect(alice).deposit(0, '0'); // block 95
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal('0')

        await relativeForward(99);

        await queen.connect(alice).deposit(0, '0'); // block 100
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal('0')

        await relativeForward(100);

        await queen.connect(alice).deposit(0, '0'); // block 101
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal(100)

        await relativeForward(104);

        await queen.connect(alice).deposit(0, '0'); // block 105
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal('500')
        expect((await chk.totalSupply()).valueOf()).to.equal('500')
    });

    it('should only reward up until the end block', async () => {
        await uniswap.connect(alice).approve(queen.address, oneEth)

        await queen.add('100', uniswap.address, true);
        await uniswap.connect(alice).approve(queen.address, '1000');
        await queen.connect(alice).deposit(0, '100');

        await relativeForward(104)
        await queen.connect(alice).deposit(0, '0'); // block 105
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal('500')
        expect((await chk.totalSupply()).valueOf()).to.equal('500')

        await relativeForward(499)
        await queen.connect(alice).deposit(0, '0'); // block 500
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal('40000')
        expect((await chk.totalSupply()).valueOf()).to.equal('40000')

        await relativeForward(549)
        await queen.connect(alice).deposit(0, '0'); // block 550
        expect((await chk.balanceOf(aliceAddr)).valueOf()).to.equal('40000')
        expect((await chk.totalSupply()).valueOf()).to.equal('40000')
    });


})