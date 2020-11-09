import { Wallet, getDefaultProvider, utils, BigNumber } from 'ethers'
import { OptionsPoolFactory } from '../types/ethers-contracts/OptionsPoolFactory'
import PoolArtifact from '../deployments/mainnet/YFIPool.json'

async function main() {
  const poolDeployment = PoolArtifact

  const provider = getDefaultProvider('mainnet', {
    infura: process.env.PROJECT_ID,
  })
  const wallet = Wallet.fromMnemonic(process.env.MAINNET_MNEMONIC!).connect(
    provider
  )

  const pool = OptionsPoolFactory.connect(poolDeployment.address, wallet)
  const end = (await pool.epochStart()).add(await pool.epochLength())

  const currBlock = await provider.getBlockNumber()
  if (currBlock >= end.toNumber()) {  
    console.log("testing YFI POOL for end");
    return pool.testForEnd({
      gasLimit: 1000000,
    });
  }
  return null
}

main()
    .then(async (response) => {
      if (response) {
        console.log("response: ", response)
        const receipt = await response.wait()
        console.log("receipt: ", receipt)
      }
    
      process.exit(0)
    })
    .catch(error => {
      console.log("err: ", error)
      process.exit(1)
    })
