/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable import/extensions */
import React, { useState } from 'react'
import ethers, { providers, Signer, BigNumber, utils, getDefaultProvider } from 'ethers'
import { DevOracleFactory } from '../../typed-contracts/DevOracleFactory'
import { IPriceOracleGetterFactory } from '../../typed-contracts/IPriceOracleGetterFactory'
import { OptionsPoolFactory } from '../../typed-contracts'

import LocalhostYFIPoolArtifact from '../../deployments/localhost/YFIPool.json'
import LocalhostPicklePoolArtifact from '../../deployments/localhost/PICKLESPoolV10.json'
import LocalhostDevOracleArtifact from '../../deployments/localhost/DevOracle.json'
import LocalhostQueenArtifact from '../../deployments/localhost/Queen.json'
import LocalhostChkArtifact from '../../deployments/localhost/CheckToken.json'
import LocalhostFaucetArtifact from '../../deployments/localhost/FaucetV3.json'

import KovanYFIPoolArtifact from '../../deployments/kovan/YFIPool.json'
import KovanPicklesPoolArtifact from '../../deployments/kovan/PICKLESPoolV10.json'
import KovanTestnetOracleArtifact from '../../deployments/kovan/DevOracle.json'
import KovanTestnetQueenArtifact from '../../deployments/kovan/Queen.json'
import KovanTestnetChkArtifact from '../../deployments/kovan/CheckToken.json'
import KovanFaucetArtifact from '../../deployments/kovan/FaucetV3.json'

import MainnetYFIPoolArtifact from '../../deployments/mainnet/YFIPool.json'
import MainnetPicklePoolArtifact from '../../deployments/mainnet/PICKLESPoolV10.json'

import { ChainId, TokenAmount, Fetcher, Token } from '@uniswap/sdk'
import { toHuman } from '../../lib/format'
import WalletConnectProvider from "@walletconnect/web3-provider";

import Web3Modal from "web3modal";

declare const window:any

window.ethers = ethers // useful for the dev environment console

const mainnetYFI = "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e"
const mainnetPickles = '0x429881672b9ae42b8eba0e26cd9c73711b891ca5'
const mainnetWeth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

type ArtifactsByNetwork = {
  [network:string]:{
    YFIPool:any
    PicklesPool:any
    DevOracle?:any
    Queen?:any
    CHK?:any
    Faucet?:any
  }
}

const artifacts:ArtifactsByNetwork = {
  localhost: {
    YFIPool: LocalhostYFIPoolArtifact,
    PicklesPool: LocalhostPicklePoolArtifact,
    DevOracle: LocalhostDevOracleArtifact,
    Queen: LocalhostQueenArtifact,
    CHK: LocalhostChkArtifact,
    Faucet: LocalhostFaucetArtifact
  },
  kovan: {
    YFIPool: KovanYFIPoolArtifact,
    PicklesPool: KovanPicklesPoolArtifact,
    DevOracle: KovanTestnetOracleArtifact,
    Queen: KovanTestnetQueenArtifact,
    CHK: KovanTestnetChkArtifact,
    Faucet: KovanFaucetArtifact
  },
  mainnet: {
    YFIPool: MainnetYFIPoolArtifact,
    PicklesPool: MainnetPicklePoolArtifact,
  }
}

let networkName = process.env.REACT_APP_NETWORK_NAME
if (!networkName) {
  networkName = "localhost"
}

console.log("using network: ", networkName);
console.log("artifacts: ", artifacts, " by network: ", artifacts[networkName])
debugger
const uniswapAddr = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'

const YFIPoolArtifact = artifacts[networkName].YFIPool
const PicklesPoolArtifact = artifacts[networkName].PicklesPool
const DevOracleArtifact = artifacts[networkName].DevOracle
const QueenArtifact = artifacts[networkName].Queen
const CheckToken = artifacts[networkName].CHK
const FaucetArtifact = artifacts[networkName].Faucet

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider, // required
    options: {
      infuraId: process.env.REACT_APP_PROJECT_ID // required
    }
  }
};

const web3Modal = new Web3Modal({
  network: networkName, // optional
  cacheProvider: true, // optional
  providerOptions: providerOptions,
});

export interface Web3ContextData {
  addr?: string
  provider?: providers.Provider
  signer?: Signer
  loading?: boolean
  connect: ()=>Promise<void>
  connected: boolean,
  pools: {
    yfi:string
    pickles:string
  },
  queen: string,
  CHK: string,
  faucet: string,
  uniswapAddr: string,
  network:string,
}

export const Web3Context = React.createContext<Web3ContextData>({
  connected: false,
  connect: () => Promise.reject('not setup'),
  pools: {
    yfi: YFIPoolArtifact.address,
    pickles: PicklesPoolArtifact.address,
  },
  queen: QueenArtifact?.address,
  CHK: CheckToken?.address,
  faucet: FaucetArtifact,
  uniswapAddr,
  network:networkName,
})

const oneEth = utils.parseEther('1')
const AAVEMainnetAddress = "0x76b47460d7f7c5222cfb6b6a75615ab10895dde4";

async function getYFIPrice(mainnetProvider:providers.BaseProvider) {
  const mainnetPricer = IPriceOracleGetterFactory.connect(
    AAVEMainnetAddress,
    mainnetProvider
  ); // AAVE price oracle
  return mainnetPricer.getAssetPrice(mainnetYFI);
}
async function getPicklesPrice(mainnetProvider:providers.BaseProvider) {
  const Pickles = new Token(ChainId.MAINNET, mainnetPickles, 18, 'PICKLE', 'Pickles')
  const WETH = new Token(ChainId.MAINNET, mainnetWeth, 18, 'weth', 'Wrapped Ether')
  const pair = await Fetcher.fetchPairData(
    Pickles,
    WETH,
    mainnetProvider,
  )
  const [price,] = pair.getOutputAmount(new TokenAmount(Pickles, oneEth.toString()))
  const priceStr = (parseFloat(price.toFixed(18)) * 1e18).toString()
  console.log("pickles price: ", priceStr)
  return BigNumber.from(priceStr)
}

async function doRandomPriceUpdates(signer: Signer) {
  const mainnetProvider = getDefaultProvider()
  const [picklesPrice, YFIPrice] = await Promise.all([
    getPicklesPrice(mainnetProvider),
    getYFIPrice(mainnetProvider),
  ])
  
  const oracle = DevOracleFactory.connect(DevOracleArtifact.address, signer)
  const yfiPool = OptionsPoolFactory.connect(YFIPoolArtifact.address, signer)
  const picklesPool = OptionsPoolFactory.connect(PicklesPoolArtifact.address, signer)
  
  console.log("pickles price: ", toHuman(picklesPrice), " yfi: ", toHuman(YFIPrice))

  await oracle.setPrice(await yfiPool.underlying(), YFIPrice)
  await oracle.setPrice(await picklesPool.underlying(), picklesPrice)
  // only want to do this in DEV where no one else is doing it
  yfiPool.testForEnd()
  picklesPool.testForEnd()
  setTimeout(()=>doRandomPriceUpdates(signer), Math.random() * 30000)
}

export const Web3Provider:React.FC = ({ children }) => {
  const [ctx, setCtx] = useState<Web3ContextData>({
    connected: false,
    pools: {
      yfi: YFIPoolArtifact.address,
      pickles: PicklesPoolArtifact.address,
    },
    queen: QueenArtifact?.address,
    CHK: CheckToken?.address,
    uniswapAddr,
    network:networkName!,
    faucet: FaucetArtifact?.address,
    connect: () => Promise.reject('not setup'),
  })

  window.ctx = ctx

  const onConnect = async () => {
    setCtx((s) => { return { ...s, loading: true } })

    let provider:providers.Provider
    let signer:Signer
    if (networkName === 'localhost') {
      const rpcProvider = new providers.JsonRpcProvider()
      signer = rpcProvider.getSigner(1)
      provider = rpcProvider
      doRandomPriceUpdates(signer)
    } else {
      // await window.ethereum.enable()
      const web3Provider = new providers.Web3Provider(await web3Modal.connect())
      signer = web3Provider.getSigner()
      provider = web3Provider
    }

    const addr = await signer.getAddress()
    
    window.provider = provider
    window.signer = signer

    setCtx((s) => {
      return {
        ...s,
        signer,
        provider,
        addr,
        loading: false,
        connected: true,
      }
    })
  }

  return (
    <Web3Context.Provider value={{
      ...ctx,
      connect: onConnect,
    }}
    >
      {children}
    </Web3Context.Provider>
  )
}
