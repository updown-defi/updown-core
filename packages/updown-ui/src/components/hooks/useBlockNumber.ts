import { Provider } from '@ethersproject/providers'
import { useState, useEffect } from 'react'

export const useBlockNumber = (provider?: Provider) => {
    const [blockNumber, setBlockNumber] = useState(0)

    // update the blockNumber
    useEffect(() => {
        if (provider) {
            const blockUpdater = (blkNumber: number) => {
                setBlockNumber(blkNumber)
            }
            console.log('subscribing to block')
            provider.getBlockNumber().then((num)=> {
                setBlockNumber(num)
            }).catch((err)=> {
                console.error("error getting block:", err)
            }).finally(()=> {
                provider.on('block', blockUpdater)
            })
            return () => { provider?.off('block', blockUpdater) }
        }
        return () => { }
    }, [provider])

    return blockNumber
}