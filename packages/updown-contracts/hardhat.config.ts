import { HardhatUserConfig, task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Wallet, utils } from "ethers";
import secretsJSON from "./secrets.json";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";

const oneEth = utils.parseEther("1");

task("unibalance", "get the balance of an address")
  .addParam("address", "the address to lookup")
  .setAction(
    async (
      args: { address: string },
      bre: HardhatRuntimeEnvironment,
      _super
    ) => {
      const { deployments, getNamedAccounts } = bre;
      const { read } = deployments;
      const { deployer } = await getNamedAccounts();

      const { address } = args;

      const bal = await read("LocalUniV8", "balanceOf", address);
      console.log("balance: ", utils.formatEther(bal));
    }
  );

task("balance", "get the balance of a named account")
  .addParam("name", "the name of the account")
  .setAction(
    async (
      {name}: { name: string },
      bre: HardhatRuntimeEnvironment,
      _super
    ) => {
      const { deployments, getNamedAccounts } = bre;
      const { read } = deployments;
      const accts = await getNamedAccounts();

      const acct = accts[name]
      if (!acct) {
        throw new Error("unknown account: " + name)
      }

      const bal = await bre.ethers.provider.getBalance(acct)
      console.log("balance: ", utils.formatEther(bal));
    }
  );

task("addcode", "adds a code to the faucet")
  .addParam("code", "the code in plain text")
  .setAction(
    async (args: { code: string }, bre: HardhatRuntimeEnvironment, _super) => {
      const { deployments, getNamedAccounts } = bre;
      const { execute, log, get } = deployments;
      const { deployer } = await getNamedAccounts();

      const { code } = args;

      const faucet = await get("Faucet");

      await execute(
        "LocalUniV8",
        { from: deployer, log: true },
        "mint",
        faucet.address,
        oneEth.mul(100000)
      );

      log("adding: ", code);
      await execute(
        "FaucetV3",
        { from: deployer, log: true },
        "addCode",
        utils.solidityKeccak256(["string"], [code]),
        oneEth.mul(100000)
      );
    }
  );

interface FileSecret {
  projectId?: string
  mnemonic?: string
  alchemyAPI?: string
  privateKey?: string
}

function getSecret(networkID: string) {
  const secrets = secretsJSON as { [networkID: string]: FileSecret };

  const secret = secrets[networkID];
  if (!secret) {
    return [];
  }
  if (secret.mnemonic) {
    const wallet = Wallet.fromMnemonic(secret.mnemonic!);
    return [wallet.address, wallet.privateKey];
  } else if (secret.privateKey) {
    const wallet = new Wallet(secret.privateKey)
    return [wallet.address, wallet.privateKey]
  }

  // unknown secret
  return []
}

function getProjectID(networkID: string) {
  const secrets = secretsJSON as { [networkID: string]: FileSecret };

  const secret = secrets[networkID];
  if (!secret) {
    return "";
  }
  return secrets[networkID].projectId;
}

let networks: { [key: string]: any } = {};
const secrets = secretsJSON as { [networkID: string]: FileSecret };

if (secrets["5"]) {
  networks["goerli"] = {
    url: `https://goerli.infura.io/v3/${getProjectID("5")}`,
    accounts: [getSecret("5")[1]],
  };
}

if (secrets["42"]) {
  networks["kovan"] = {
    url: `https://kovan.infura.io/v3/${getProjectID("42")}`,
    accounts: [getSecret("42")[1]],
  };
}

if (secrets["1"]) {
  networks["mainnet"] = {
    url: `https://mainnet.infura.io/v3/${getProjectID("1")}`,
    accounts: [getSecret("1")[1]],
  };
}

// If you need to debug a bit and turn on console.log, you probably need to uncomment the below:
networks['hardhat'] = {
  forking: {
    url: `https://eth-mainnet.alchemyapi.io/v2/${(Reflect.get(secretsJSON, '1') || {})['alchemyAPI']}`,
  },
  allowUnlimitedContractSize: true,
  gasLimit: 12000000,
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
      default: 0,
      5: getSecret("5")[0],
      42: getSecret("42")[0],
    },
    alice: {
      default: 1,
      5: "0xc6E9a9541F992c06BEbc036f0711C25e6DDbbDB8",
      42: "0xc6E9a9541F992c06BEbc036f0711C25e6DDbbDB8",
    },
    bob: {
      default: 2,
      5: "0xF24cB86313039c7e7D456813c9fFdd591b421Cc2",
      42: "0xF24cB86313039c7e7D456813c9fFdd591b421Cc2",
    },
    bman: {
      5: "0xAb83B8EE2956a3e0f3C2ba7DEE0139E09a76C090",
      42: "0xAb83B8EE2956a3e0f3C2ba7DEE0139E09a76C090",
    },
    aman: {
      5: "0x53D4C64701b8DD43ac3BF2138D09f5D7E5f38B5b",
      42: "0x53D4C64701b8DD43ac3BF2138D09f5D7E5f38B5b",
    },
    dman: {
      5: "0xBf22847152e0FAc2E65BDa09C9B3dF4fB7A7cE77",
      42: "0xBf22847152e0FAc2E65BDa09C9B3dF4fB7A7cE77",
    },
    kman: {
      5: "0x8B48DE31b4EBF66B574Afb0Cb02a238956Ff5C0e",
      42: "0x8B48DE31b4EBF66B574Afb0Cb02a238956Ff5C0e",
    },
    sp: {
      5: "0xDe8ed579004CF8fCEAd43613243B2A6B06244672",
      42: "0xDe8ed579004CF8fCEAd43613243B2A6B06244672",
    },
    l: {
      default: 3,
      5: "0xAe04119eBFf88C0F519D150DD97D3DA00B42dc90",
      42: "0xAe04119eBFf88C0F519D150DD97D3DA00B42dc90",
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.5.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          evmVersion: 'istanbul',
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          evmVersion: 'istanbul',
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          evmVersion: 'istanbul',
        },
      },
    ],
  },
  networks,
};
export default config;
