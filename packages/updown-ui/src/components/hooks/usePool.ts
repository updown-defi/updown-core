import {
  useState, useEffect, useContext, useCallback,
} from 'react'
import { BigNumber } from 'ethers'
import { Web3Context } from '../contexts/Web3Context'
import { Erc20PresetMinterPauserFactory } from '../../typed-contracts/Erc20PresetMinterPauserFactory'
import { Ierc20NameableFactory } from '../../typed-contracts/Ierc20NameableFactory'
import { IPriceOracleGetterFactory } from '../../typed-contracts/IPriceOracleGetterFactory'
import { RebaseableTokenFactory } from '../../typed-contracts/RebaseableTokenFactory'
import { OptionsPool } from '../../typed-contracts/OptionsPool'
import { OptionsPoolFactory } from '../../typed-contracts/OptionsPoolFactory'
import { useBlockNumber } from './useBlockNumber'

import { toHuman } from '../../lib/format'
import { useWaitWithmessage } from './waitWithMessage'

interface PoolPerBlockInfo {
  currentPrice: BigNumber
  downBalance: BigNumber
  upBalance: BigNumber
  payoutTokenBalance: BigNumber
}

interface PoolPerEpochInfo {
  epoch: number
  startBlock: number
  endBlock: number
  startPrice: BigNumber
  settledAt?: number
  epochLoading: boolean
}

interface StaticPoolInfo {
  payoutTokenName: string
  payoutTokenSymbol: string
  underlyingAddress?: string
  underlying?:ReturnType<typeof Ierc20NameableFactory.connect>
  underlyingSymbol?: string
}

interface PoolContracts {
  optionsPool?: OptionsPool
  payoutToken?: ReturnType<typeof Erc20PresetMinterPauserFactory.connect> // TODO: this should be a IERC20
  up?: ReturnType<typeof RebaseableTokenFactory.connect>
  down?: ReturnType<typeof RebaseableTokenFactory.connect>
  oracle?: ReturnType<typeof IPriceOracleGetterFactory.connect>
}

type AllPoolInfo = (PoolPerEpochInfo & PoolPerBlockInfo & StaticPoolInfo & PoolContracts)

const zero = BigNumber.from(0)

export interface PoolInfo extends AllPoolInfo {
  blockNumber: number
  deposit: (amount:BigNumber)=>Promise<void>
  settle: ()=>Promise<void>
  liquidate: ()=>Promise<void>
}

export const usePool:(addr: string)=>PoolInfo = (poolAddress:string) => {
  const { provider, signer } = useContext(Web3Context)
  const blockNumber = useBlockNumber(provider)

  const waitWithMessage = useWaitWithmessage()

  const [contracts, setContracts] = useState<PoolContracts>({})

  const [epochInfo, setEpochInfo] = useState<PoolPerEpochInfo>({
    epoch: 0,
    startBlock: 0,
    endBlock: 0,
    startPrice: zero,
    epochLoading: false,
  })
  const [blockInfo, setBlockInfo] = useState<PoolPerBlockInfo>({
    currentPrice: zero,
    downBalance: zero,
    upBalance: zero,
    payoutTokenBalance: zero,
  })
  const [staticInfo, setStaticInfo] = useState<StaticPoolInfo>({
    payoutTokenName: '',
    payoutTokenSymbol: '',
    underlyingAddress: '',
  })

  const deposit = useCallback(async (amount:BigNumber):Promise<void> => {
    if (!contracts.optionsPool || !contracts.payoutToken || !contracts.optionsPool || !signer) {
      throw new Error('missing requirements')
    }
    const approveResp = await waitWithMessage(`Getting approval to deposit ${toHuman(amount)} ${staticInfo.payoutTokenSymbol}`, contracts.payoutToken.approve(contracts.optionsPool.address, amount))
    const receipt = await approveResp.wait()
    if (receipt.status === 0) {
      return // Tx was unsuccessful
    }
    const resp = await waitWithMessage(`Depositing ${toHuman(amount)} ${staticInfo.payoutTokenSymbol}`, contracts.optionsPool.deposit(amount))
    await resp.wait()
    return
  }, [contracts, signer, staticInfo.payoutTokenSymbol, waitWithMessage])

  const settle = useCallback(async () => {
    if (!contracts.optionsPool || !signer) {
      throw new Error('missing requirements')
    }
    const resp = await waitWithMessage("Settling your position", contracts.optionsPool.settle())
    await resp.wait()
    setEpochInfo((s) => {
      return {
        ...s,
        settledAt: s.epoch
      }
    })
  }, [contracts, signer, waitWithMessage])

  const liquidate = useCallback(async () => {
    if (!contracts.optionsPool) {
      throw new Error('missing requirements')
    }
    const resp = await waitWithMessage(`Liquidating your position.`, contracts.optionsPool.liquidate())
    await resp.wait()
    setEpochInfo((s) => {
      return {
        ...s,
        settledAt: undefined,
      }
    })
  }, [contracts.optionsPool, waitWithMessage])

  // grab the rest of the contract addresses
  useEffect(() => {
    const loadAsync = async () => {
      if (!provider || !signer) {
        throw new Error('provider and signer are required')
      }
      const optionsPool = OptionsPoolFactory.connect(poolAddress, signer)

      const [payoutTokenAddr, upAddr, downAddr, oracleAddr] = await Promise.all([
        optionsPool.payoutToken(),
        optionsPool.up(),
        optionsPool.down(),
        optionsPool.oracle(),
      ])

      // console.log("espool: ", await optionsPool.espool(), "up: ", upAddr, " down: ", downAddr)

      const payoutToken = Erc20PresetMinterPauserFactory.connect(payoutTokenAddr, signer)
      const up = RebaseableTokenFactory.connect(upAddr, signer)
      const down = RebaseableTokenFactory.connect(downAddr, signer)
      const oracle = IPriceOracleGetterFactory.connect(oracleAddr, signer)

      setContracts((s) => {
        return {
          ...s, optionsPool, payoutToken, up, down, oracle,
        }
      })
    }
    if (provider && signer && !contracts.optionsPool) {
      console.log('loading contracts')
      loadAsync()
    }
  }, [provider, signer, contracts.optionsPool, poolAddress])

  // update all the static info
  useEffect(() => {
    const loadAsync = async () => {
      console.log('loading token names')
      if (!provider || !signer || !contracts.payoutToken || !contracts.optionsPool) {
        throw new Error('provider and signer are required')
      }
      const [payoutTokenName, payoutTokenSymbol, underlyingAddress] = await Promise.all([
                contracts.payoutToken?.name(),
                contracts.payoutToken?.symbol(),
                contracts.optionsPool?.underlying(),
      ])
      if (!underlyingAddress) {
        throw new Error("underlying address not returned")
      }
      const underlying = Ierc20NameableFactory.connect(underlyingAddress, signer)
      const underlyingSymbol = await underlying.symbol()
      setStaticInfo((s) => {
        return {
          ...s, 
          payoutTokenName: payoutTokenName!, 
          payoutTokenSymbol: payoutTokenSymbol!, 
          underlyingAddress,
          underlying,
          underlyingSymbol
        }
      })
    }

    if (!staticInfo.payoutTokenName && contracts.optionsPool && contracts.down && contracts.up && contracts.payoutToken) {
      loadAsync()
    }
  }, [provider, contracts, staticInfo.payoutTokenName, signer])

  // update every block and if the epoch is higher than end epoch, update there too
  useEffect(() => {
    const loadAsync = async () => {
      console.log('block loader')
      const addr = await signer?.getAddress()
      const [price, upBalance, downBalance, payoutTokenBalance] = await Promise.all([
                contracts.oracle?.getAssetPrice(staticInfo.underlyingAddress!),
                contracts.up?.balanceOf(addr!),
                contracts.down?.balanceOf(addr!),
                contracts.payoutToken?.balanceOf(addr!),
      ])
      if (price) {
        setBlockInfo((s) => {
          return {
            ...s,
            currentPrice: price,
            downBalance: downBalance!,
            upBalance: upBalance!,
            payoutTokenBalance: payoutTokenBalance!,
          }
        })
      }
    }

    if (provider && signer && staticInfo.underlyingAddress && contracts.oracle && contracts.up && contracts.down && blockNumber > 0) {
      loadAsync()
      if (epochInfo.endBlock < blockNumber) {
        setEpochInfo((s) => {
          return { ...s, epoch: s.epoch + 1, }
        })
      }
    }
  }, [provider, signer, blockNumber, staticInfo, contracts, epochInfo.endBlock])

  // update the epoch info
  useEffect(() => {
    const loadAsync = async () => {
      console.log('epoch loader')
      const { optionsPool, up } = contracts
      const addr = await signer?.getAddress()

      const [epoch, startBlock, duration, startPrice, settledAt] = await Promise.all([
                optionsPool?.epoch(),
                optionsPool?.epochStart(),
                optionsPool?.epochLength(),
                optionsPool?.epochStartPrice(),
                up?.settledAt(addr!),
      ])

      setEpochInfo((s) => {
        return {
          ...s,
          epochLoading: false,
          epoch: epoch!.toNumber(),
          startBlock: startBlock!.toNumber(),
          startPrice: startPrice!,
          endBlock: startBlock!.add(duration!).toNumber(),
          settledAt: settledAt!.toNumber(),
        }
      })
    }
    if (provider && contracts.optionsPool && !epochInfo.epochLoading) {
      setEpochInfo((s)=>{return {...s, epochLoading: true}})
      loadAsync()
    }
  }, [provider, epochInfo.epoch, contracts]) //eslint-disable-line react-hooks/exhaustive-deps
  // not using exhaustive because don't want to end up in the loop due to loading
  return {
    ...epochInfo,
    ...staticInfo,
    ...blockInfo,
    ...contracts,
    blockNumber,
    deposit,
    settle,
    liquidate,
  }
}
