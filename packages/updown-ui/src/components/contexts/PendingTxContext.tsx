import React, { useCallback, useState } from 'react'

interface PendingTxState {
  count: number
  incrementCount: () => void
  decrementCount: () => void
}

export const PendingTxContext: React.Context<PendingTxState> = React.createContext({
  count: 0,
  incrementCount: () => { },
  decrementCount: () => { }
})

export const PendingTxProvider: React.FC = ({ children }) => {
  const [ count, updateCount ] = useState(0)
  const incrementCount = useCallback(() => {
    updateCount((prev) => prev + 1)
  }, [updateCount])
  const decrementCount = useCallback(() => {
    updateCount((prev) => prev - 1)
  }, [updateCount])
  return <PendingTxContext.Provider value={{
    count,
    incrementCount,
    decrementCount,
  }} >
    {children}
  </PendingTxContext.Provider>
}
