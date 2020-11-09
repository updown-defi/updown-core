/* eslint-disable comma-dangle */
import React, { useContext, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BigNumber, utils } from 'ethers'
import PositionInfoCard from '../components/common/PositionInfoCard/PositionInfoCard'
import Button from '../components/common/Button/Button'
import { PoolInfo, usePool } from '../components/hooks/usePool'
import { SettlementButton } from '../components/common/Button/SettlementButton'
import swapIcon from '../assets/image/icons/emoji/exchange.svg'
import moneyEmoji from '../assets/image/icons/emoji/money.svg'
import lightEmoji from '../assets/image/icons/emoji/light.svg'
import celebraterEmoji from '../assets/image/icons/emoji/celebrate.svg'
import smileEmoji from '../assets/image/icons/emoji/smile.svg'
import happyEmoji from '../assets/image/icons/emoji/happy.svg'
import Layout from '../layouts/Layout/Layout'
import { toHuman } from '../lib/format'
import thinkEmoji from '../assets/image/icons/emoji/think.svg'
import blackBg from '../assets/image/backgrounds/grey.svg'
import { Web3Context } from '../components/contexts/Web3Context'

declare const window: any

class ErrorWithReason extends Error {
  reason?: string

  constructor(reason: string) {
    super(reason)
    this.reason = reason
  }
}

const DepositSection: React.FC<{ pool: PoolInfo }> = ({ pool }) => {
  const { payoutTokenSymbol, payoutTokenBalance, deposit } = pool

  const [error, setError] = useState('')
  const [depositValue, setDepositValue] = useState('')
  const [makeDepositLoading, setMakeDepositLoading] = useState(false)

  const handleError = (err: any) => {
    if (err.body) {
      try {
        const body = JSON.parse(err.body)
        const msg = body?.error?.message
        if (msg) {
          setError(msg)
          return
        }
      } catch {}
    }

    if (err.reason) {
      setError(err.reason)
      return
    }

    if (err.message) {
      setError(`${err.message}`)
      return
    }

    setError(`${err}`)
  }

  const makeDeposit = async () => {
    setMakeDepositLoading(true)
    try {
      if (depositValue === '') {
        throw new ErrorWithReason('You must enter an amount to deposit')
      }
      const ethDepositValue = utils.parseUnits(depositValue, 'ether')

      if (ethDepositValue <= BigNumber.from(0)) {
        throw new ErrorWithReason('Deposit must be greater than 0')
      }

      await deposit(ethDepositValue)
    } catch (err) {
      handleError(err)
    }
    setMakeDepositLoading(false)
    setDepositValue('')
  }

  if (makeDepositLoading) {
    return (
      <section className="w-full flex flex-col items-left justify-center mb-10">
        <p className="text-body text-gray-700 mt-6">Loading please wait ...</p>
      </section>
    )
  }

  return (
    <section className="w-full flex flex-col items-center items-left justify-center mb-20">
      <h2 className="text-h5 font-bold text-gray-800 mb-2 text-center">
        Deposit
      </h2>
      {error && (
        <div className="px-8 py-5 mb-5 bg-red-300 rounded-primary text-paragraph-2 text-center text-bold font-semibold">
          {error}
        </div>
      )}
      <p className="text-gray-500 font-semibold text-paragraph-2 text-center mb-6">
        Available balance&nbsp;:&nbsp;
        <span className="text-black">
          {toHuman(payoutTokenBalance)} {payoutTokenSymbol}
        </span>
      </p>

      <div className="flex items-center w-3/4">
        <input
          className=" appearance-none bg-gray-100 border1 mr-8 rounded-primary w-full
      py-6 px-6 text-gray-900 text-body leading-tight focus:outline-none focus:shadow-outline"
          value={depositValue}
          onChange={e => {
            if (error) {
              setError('')
            }
            setDepositValue(e.target.value)
          }}
          placeholder={`Amount of ${payoutTokenSymbol} to deposit`}
        />

        <Button
          type="button"
          name="deposit"
          className="capitalize mb-2 font-bold"
          textColor="text-black"
          buttonBackground="bg-primary"
          onClick={makeDeposit}
          padding="px-8 py-6 pr-12"
        >
          <img src={thinkEmoji} alt="warning" className="mr-4" />

          <span className="font-black inline-block">Deposit</span>
        </Button>
      </div>
    </section>
  )
}

const EpochSection: React.FC<{ pool: PoolInfo }> = ({ pool }) => {
  const {
    epoch,
    startBlock,
    startPrice,
    endBlock,
    upBalance,
    downBalance,
    payoutTokenSymbol,
    epochLoading
  } = pool
  if (epochLoading) {
    return <section className="w-full">Loading...</section>
  }
  return (
    <section className="w-full">
      <div className="flex justify-center items-center mb-16">
        <img src={lightEmoji} alt="Start block emoji" className="mr-4 w-6" />
        <h3 className="font-semibold text-body text-center">
          Epoch - {epoch.toString()}
        </h3>
      </div>
      <div className="flex items-center mb-16">
        <img src={moneyEmoji} alt="Start block emoji" className="mr-8" />
        <h3 className="font-semibold text-h6 text-gray-700">Start price</h3>
        <p className="font-bold text-right flex-grow text-h6">
          {toHuman(startPrice)}
        </p>
      </div>
      <div className="flex items-center mb-16">
        <img src={smileEmoji} alt="Start block emoji" className="mr-8" />
        <h3 className="font-semibold text-h6 text-gray-700">Start Block</h3>
        <p className="font-bold text-right flex-grow text-h6">
          {startBlock.toString()}
        </p>
      </div>
      <div className="flex items-center mb-16">
        <img src={celebraterEmoji} alt="Start block emoji" className="mr-8" />
        <h3 className="font-semibold text-h6 text-gray-700">End Block</h3>
        <p className="font-bold text-right flex-grow text-h6">
          {endBlock.toString()}
        </p>
      </div>
      <div className="flex items-center">
        <img src={happyEmoji} alt="Start block emoji" className="mr-8" />
        <h3 className="font-semibold text-h6 text-gray-700">Current value</h3>
        <p className="font-bold text-right flex-grow text-h6">
          {toHuman(upBalance.add(downBalance).div(200))} {payoutTokenSymbol}
        </p>
      </div>
    </section>
  )
}

const getBalancerUrl = (network:string, up:string, down:string) => {
  switch(network) {
    case 'localhost':
      console.error("no balancer locally")
      return '';
    case 'kovan':
      return `https://kovan.balancer.exchange/#/swap/${up}/${down}`
    default:
      console.log("returning default mainnet balancer URL")
      return `https://balancer.exchange/#/swap/${up}/${down}`
  }
}

const PoolPage: React.FC = () => {
  const { poolAddress } = useParams<{ poolAddress: string }>()

  const {network} = useContext(Web3Context)

  const pool = usePool(poolAddress)
  window.pool = pool
  const {
    payoutTokenName,
    underlyingSymbol,
    upBalance,
    downBalance,
    currentPrice,
    up,
    down,
  } = pool

  const upAddr = up?.address
  const downAddr = down?.address

  const balancerExchangeUrl = getBalancerUrl(network, upAddr!, downAddr!)

  return (
    <Layout>
      <div
        style={{ maxWidth: '1440px' }}
        className="flex w-full bg-opacity-25 items-center flex-col  pt-5 bg-gray-100 min-h-screen"
      >
        <h1 className="text-h4 font-bold text-gray-800 mt-20 mb-2 text-center">
          {payoutTokenName} tracking {underlyingSymbol}
        </h1>

        <h2 className="text-gray-800 text-base text-center mb-20">
          Current {underlyingSymbol} Price: {toHuman(currentPrice)}
        </h2>

        {/* <article
          style={{
            backgroundImage: `url("${blackBg}")`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            height: '250px',
            width: '290'
          }}
          className="w-1/4 flex flex-col mt-10 mb-24 justify-between pb-12 pt-24 rounded-primary overflow-hidden items-center px-8"
        >
          <div>
            <h2 className=" text-base text-center font-semibold text-white">
              Total Winnings:
            </h2>
            <p className="text-white text-center text-h4 font-bold">100.00 </p>
          </div>

          <Button
            type="button"
            name="deposit"
            className="capitalize mb-2 font-bold"
            textColor="text-theme-yellow"
            buttonBackground="bg-theme-dark-gray"
            onClick={() => {}}
            padding="px-8 py-6 pr-12"
          >
            <img src={thinkEmoji} alt="warning" className="mr-4" />

            <span className="font-black inline-block">Deposit</span>
          </Button>
        </article> */}

        <section className="w-4/5 xl:w-4/5 mt-5 flex mb-16 items-center">
          <PositionInfoCard type="UP" balance={upBalance} />
          <button
            type="button"
            className="w-1/5 flex flex-col items-center text-base text-gray-700 underline hover:no-underline"
          >
            <img src={swapIcon} alt="left-right arrows signifying swap" />
            <a href={balancerExchangeUrl} rel="noreferrer" target="_blank">
              Exchange Ups/Downs
            </a>
          </button>
          <PositionInfoCard type="DOWN" balance={downBalance} />
        </section>

        <section className="w-1/2 mb-16 mt-32">
          <div className=" px-12">
            <DepositSection pool={pool} />
            <EpochSection pool={pool} />

            <SettlementButton pool={pool} />
          </div>
        </section>

        <section className="w-2/3 mt-5 px-10 pt-10 pb-40">
          <p className="text-body text-center">
            Ups and Downs are rebased at the end of each Epoch relative to the
            performance of
            {` ${underlyingSymbol}`}. <br />
            Settle signals your intent to withdraw from the pool. You may
            withdraw after the current Epoch has ended. The current Epoch&#39;s
            rebase is applied to your balance of Ups/Downs before you may
            liquidate. Your account is locked while you have a settlment pending
            (no deposits either).
            <br />
            Once you have settled, you may liquidate your settlement (receive{' '}
            {payoutTokenName}) at any time in the future. Future Epochs will not
            affect your settlement&#39;s value.
            <br />
            After settling, you must liquidate before you may deposit again.
          </p>
        </section>
      </div>
    </Layout>
  )
}

export default PoolPage
