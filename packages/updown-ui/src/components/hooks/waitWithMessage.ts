import { useCallback, useContext } from 'react'
import { TransactionResponse } from '@ethersproject/providers'
import { useToasts } from 'react-toast-notifications'
import { PendingTxContext } from '../contexts/PendingTxContext'

export const useWaitWithmessage = ()=> {
  const { addToast, removeToast } = useToasts()
  const { incrementCount, decrementCount } = useContext(PendingTxContext)

  const waitWithMessage = useCallback((message:string, txResponse:Promise<TransactionResponse>) => {
    incrementCount()
    let toastId:string
    addToast(message, {appearance: 'info'}, (id)=>{toastId=id})
    txResponse.then(async (receipt)=> {
      console.log('success: ', receipt)
      try {
        await receipt.wait()
      } catch(err) {
        throw err
      } finally {
        decrementCount()
        removeToast(toastId)
      }
    }).catch((err)=> {
      console.error("TX error: ", err)
      addToast("There was an error with your transaction", {appearance: "error", autoDismiss: true})
      decrementCount()
    })
    return txResponse
  }, [addToast, removeToast, incrementCount, decrementCount])

  return waitWithMessage
}
