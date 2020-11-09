import { ethers } from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import { expect } from "chai";
import { CheckToken } from "../types/ethers-contracts/CheckToken";
import { Timelock } from "../types/ethers-contracts/Timelock";
import { time } from "./helpers/time";
import { deploy } from "./helpers/deployer";

function encodeParameters(types: string[], values: any) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

describe("Timelock", () => {
  let chk: CheckToken;
  let timelock: Timelock;

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
    chk = await deploy<CheckToken>("CheckToken");

    timelock = await deploy<Timelock>(
      "Timelock",
      bobAddr,
      "259200",
      chk.address
    );
  });

  it("should not allow non-owner to do operation", async () => {
    return timelock
      .connect(alice)
      .queueTransaction(
        chk.address,
        "0",
        "transferOwnership(address)",
        encodeParameters(["address"], [aliceAddr]),
        (await time.latest(ethers.provider)).add(time.duration.days(4))
      )
      .then((res) => {
        expect(res).to.be.undefined; // shouldn't get here
      })
      .catch((err) => {
        expect(err.message).to.include("Call must come from admin.");
      });
  });

  it("should do the timelock thing", async () => {
    await chk.transferOwnership(timelock.address);
    const eta = (await time.latest(ethers.provider)).add(time.duration.days(4));
    await timelock
      .connect(bob)
      .queueTransaction(
        chk.address,
        "0",
        "transferOwnership(address)",
        encodeParameters(["address"], [operatorAddr]),
        eta
      );
    await time.increase(ethers.provider, time.duration.days(1));
    await timelock
      .connect(bob)
      .executeTransaction(
        chk.address,
        "0",
        "transferOwnership(address)",
        encodeParameters(["address"], [operatorAddr]),
        eta
      )
      .then((res) => {
        expect(res).to.be.undefined; // should never get here.
      })
      .catch((err) => {
        expect(err.message).to.include("surpassed time lock");
      });

    await time.increase(ethers.provider, time.duration.days(4));
    await timelock
      .connect(bob)
      .executeTransaction(
        chk.address,
        "0",
        "transferOwnership(address)",
        encodeParameters(["address"], [operatorAddr]),
        eta
      );
    expect((await chk.owner()).valueOf()).to.equal(operatorAddr);
  });

  it("allows community veto", async () => {
    await chk.mint(aliceAddr, 1000);
    await chk.mint(bobAddr, 1000);
    await chk.mint(operatorAddr, 1000);

    await chk.connect(alice).delegate(aliceAddr);
    await chk.connect(bob).delegate(bobAddr);
    await chk.connect(operator).delegate(operatorAddr);
    expect(await chk.totalSupply()).to.equal(3000);

    await chk.transferOwnership(bobAddr);

    // bob wants to transfer ownership to Eve, but the community will not have it!
    const eta = (await time.latest(ethers.provider)).add(time.duration.days(4));
    const txArgs: [Contract["address"], string, string, string, BigNumber] = [
      chk.address,
      "0",
      "transferOwnership(address)",
      encodeParameters(["address"], [operatorAddr]),
      eta,
    ];

    await timelock.connect(bob).queueTransaction(...txArgs);

    const hsh = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint", "string", "bytes", "uint"],
        txArgs
      )
    );
    await timelock.connect(alice).veto(hsh);
    await timelock.connect(operator).veto(hsh);

    await time.increase(ethers.provider, time.duration.days(4));

    await timelock
      .connect(bob)
      .executeTransaction(...txArgs)
      .then((res) => {
        expect(res).to.be.undefined; // should never get here
      })
      .catch((err) => {
        expect(err.message).to.include("Community rejected");
      });
    expect((await chk.owner()).valueOf()).to.equal(bobAddr);
  });
});
