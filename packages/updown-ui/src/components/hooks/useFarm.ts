import { TransactionResponse } from '@ethersproject/providers'
import { BigNumberish, BigNumber } from 'ethers'
import { useContext, useEffect, useState } from 'react'
import availablePools from '../../data/availablePools'
import { OptionsPoolFactory, QueenFactory, EsBalancerPoolFactory } from '../../typed-contracts'
import { Queen } from '../../typed-contracts/Queen'
import { Web3Context } from '../contexts/Web3Context'
import { useWaitWithmessage } from './waitWithMessage'

interface PoolInfo {
  lpToken: string
  allocPoint: BigNumber
  lastRewardBlock: BigNumber
  accChkPerShare: BigNumber
}

interface UserFarmInfo {
  loading: boolean
  queen?: Queen
  poolInfo?: PoolInfo
  pendingChk?: BigNumber
  staked?:BigNumber
  lpBalance?:BigNumber

  approveLPTransfer?: ()=>Promise<TransactionResponse>
  stake?: (amount:BigNumberish)=>Promise<TransactionResponse>
}

export const useFarm = (pid: BigNumberish): UserFarmInfo => {
  const ctx = useContext(Web3Context)
  const { queen: queenAddress, signer } = ctx
  const [farmInfo, setFarmInfo] = useState<UserFarmInfo>({ loading: true })

  const waitWithMessage = useWaitWithmessage()

  const pools = availablePools(ctx)
  const poolData = pools.find((pool)=>pool.queenPID === pid)

  if (!poolData) {
      throw new Error("unknown pool")
  }

  useEffect(() => {
    const doAsync = async () => {
      if (!queenAddress || !signer) {
        throw new Error('expected queen and signer')
      }
      const queen = QueenFactory.connect(queenAddress, signer)
      const userAddr = await signer.getAddress()

      const pool = OptionsPoolFactory.connect(poolData.address, signer)
      const esPoolAddr = await pool.espool()
      const espool = EsBalancerPoolFactory.connect(esPoolAddr, signer)

      const lpBalance = await espool.balanceOf(userAddr)
      const poolInfo = await queen.poolInfo(pid)
      const pendingChk = await queen.pendingChk(pid, userAddr)

      const staked = (await queen.userInfo(pid, userAddr)).amount

      const updateStaked = async ()=> {
          const staked = (await queen.userInfo(pid, userAddr)).amount
          setFarmInfo((s)=> {
            return {
              ...s,
              staked
            }
          })
      }

      const updateLPBalance = async ()=> {
        const lpBalance = await espool.balanceOf(userAddr)
        setFarmInfo((s)=> {
            return {
              ...s,
              lpBalance
            }
          })
      }

      const approveLPTransfer = async ()=> {
        return waitWithMessage("Approving your LP Transfer", espool.approve(queen.address, lpBalance))
      }

      const stake = async (amount:BigNumberish)=> {
        const resp = await waitWithMessage("Staking", queen.deposit(pid, amount))
        updateStaked()
        updateLPBalance()
        return resp
      }

      setFarmInfo(s => {
        return { 
            ...s, 
            poolInfo, 
            pendingChk, 
            staked,
            lpBalance,
            approveLPTransfer,
            stake,
            loading:false 
        }
      })
    }
    if (signer && farmInfo.loading) {
      doAsync()
    }
  }, [signer, queenAddress, pid, poolData.address, waitWithMessage])

  return farmInfo
}
