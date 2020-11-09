import React, { useState } from 'react'
import { PoolInfo } from '../../hooks/usePool'
import Button from './Button'

interface SettlementButtonProps {
  pool: PoolInfo
}

export const SettlementButton: React.FC<SettlementButtonProps> = ({ pool }) => {
  const [loading, setLoading] = useState(false)

  const onSettle = async () => {
    setLoading(true)
    try {
      await pool.settle()
    } catch (err) {
      alert(`${err.code}: ${err.reason}`)
    }
    setLoading(false)
  }

  const onLiquidate = async () => {
    setLoading(true)
    try {
      await pool.liquidate()
    } catch (err) {
      alert(`${err.code}: ${err.reason}`)
    }
    setLoading(false)
  }

  if (pool.settledAt) {
    const canLiquidate = pool.settledAt < pool.epoch || pool.endBlock < pool.blockNumber

    return (
      <div className="flex justify-center flex-col items-center mt-32">
        <Button
          type="button"
          name="liquidate"
          className={"capitalize mb-2 font-bold " + (!canLiquidate && "cursor-not-allowed")}
          textColor="text-theme-yellow"
          buttonBackground="bg-black"
          disabled={loading || !canLiquidate}
          onClick={onLiquidate}
          padding="px-8 py-6"
        >
          <span className="font-black inline-block">
            Liquidate
          </span>
        </Button>
        <p className="font-semibold text-center mt-4 text-base text-gray-800">
          {canLiquidate
            ? 'You can liquidate settlement now'
            : `You have a settlement pending you can liquidate at epoch ${pool.settledAt + 1}`}
        </p>
      </div>
    )
  }

  return (
    <div className="flex justify-center flex-col mt-32 items-center">
      <Button
        type="button"
        name="liquidate"
        className="capitalize mb-2 font-bold"
        textColor="text-theme-yellow"
        buttonBackground="bg-black"
        disabled={loading || !pool.upBalance.add(pool.downBalance).gt(0)}
        onClick={onSettle}
        padding="px-8 py-6"
      >
        <span className="font-black inline-block">
          Settle
        </span>
      </Button>
      <p className="font-semibold text-center mt-4 text-base text-gray-800">
        Settle locks your address and allows you to liquidate at the
        end of the Epoch (this Epoch&#39;s rebase is applied).
      </p>
    </div>
  )
}
