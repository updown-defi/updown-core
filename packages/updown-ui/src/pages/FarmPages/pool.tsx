/* eslint-disable comma-dangle */
import { BigNumber, utils } from 'ethers'
/* eslint-disable max-len */
import React, { useContext, useState } from 'react'
import { useParams } from 'react-router-dom'
import addIcon from '../../assets/image/icons/add-border.svg'
import Button from '../../components/common/Button/Button'
import Modal from '../../components/common/Modal/Modal'
import { Web3Context } from '../../components/contexts/Web3Context'
import { useFarm } from '../../components/hooks/useFarm'
import availablePools from '../../data/availablePools'
import Layout from '../../layouts/Layout/Layout'
import { toHuman } from '../../lib/format'

const PoolPage = () => {
  const { poolAddress } = useParams<{ poolAddress: string }>()
  const [approved, setApproved] = useState(false)
  const [depositValue, setDepositValue] = useState('')
  const [showStakeModal, setShowStakeModal] = useState(false)
  const ctx = useContext(Web3Context)
  const pools = availablePools(ctx)

  const pool = pools.find(({ address }) => {
    return address === poolAddress
  })

  if (!pool) {
    throw new Error('unkown pool')
  }

  const farm = useFarm(pool?.queenPID)

  const approveFarm = async () => {
    try {
      if (farm.approveLPTransfer) {
        await farm.approveLPTransfer()
        setApproved(true)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const onStakeHandler = async () => {
    try {
      if (farm.stake) {
        await farm.stake(utils.parseUnits(depositValue, 'ether'))
        setShowStakeModal(false)
        setDepositValue('')
      }
    } catch (error) {
      throw new Error('Error staking')
    }
  }

  return (
    <>
      <Layout>
        <div
          style={{ maxWidth: '1440px' }}
          className="px-40 pt-24 pb-32 flex w-full flex-col items-center"
        >
          <h1 className=" text-h4 mb-6 text-gray-900 font-bold w-1/2 text-center">
            Farming {pool.title}
          </h1>
          <p className="text-gray-500 mb-32 font-semibold text-paragraph-2 text-center ">
            Available balance&nbsp;:&nbsp;
            <span className="text-black">
              {farm.lpBalance && toHuman(farm.lpBalance)}
            </span>
          </p>

          <section className="w-full flex justify-center">
            <article className="px-12">
              <div
                style={{
                  background: `url(${pool.background})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: '-150%',
                  backgroundSize: 'cover',
                  height: '272px',
                  width: '313px',
                  borderRadius: '16px'
                }}
                className="pt-16 overflow-hidden pb-10 px-10 flex justify-between shadow-card items-center flex-col"
              >
                <div>
                  <p className="text-white text-center text-h3 font-bold">
                    {toHuman(farm.pendingChk || 0)}
                  </p>

                  <h2 className="text-body text-white font-semibold text-center">
                    CHK earned
                  </h2>
                </div>

                <Button
                  type="button"
                  name="Connect"
                  onClick={() => {
                    alert('todo! meanwhile see the smart contract')
                  }}
                  className="capitalize hover:bg-opacity-75"
                  textColor="text-white"
                  buttonBackground="bg-black"
                >
                  Harvest
                </Button>
              </div>
            </article>

            <article className=" px-12">
              <div
                style={{
                  height: '272px',
                  width: '313px',
                  borderRadius: '16px'
                }}
                className="pt-16 overflow-hidden pb-10 px-10 flex justify-between bg-white shadow-card items-center flex-col"
              >
                <div>
                  <p className="text-gray-900 text-center text-h3 font-bold">
                    {toHuman(farm.staked || 0)}
                  </p>

                  <h2 className="text-body text-gray-900  font-semibold text-center">
                    Total staked
                  </h2>
                </div>

                {approved ? (
                  <div className="flex items-center">
                    {(farm.staked || BigNumber.from(0)).gt(0.0) && (
                      <Button
                        type="button"
                        name="Unstake"
                        onClick={() => {
                          alert('todo: meanwhile see the SCs')
                        }}
                        className="capitalize hover:bg-opacity-75 mr-6"
                        textColor="text-black"
                        buttonBackground="bg-primary"
                      >
                        Unstake
                      </Button>
                    )}
                    <Button
                      type="button"
                      name="Add more"
                      onClick={() => setShowStakeModal(true)}
                      className="capitalize text-h6 bg-gray-200 hover:bg-opacity-75"
                      padding="px-10 py-8"
                    >
                      <img alt="add icon" src={addIcon} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    name="Approve"
                    onClick={approveFarm}
                    className="capitalize hover:bg-opacity-75"
                    textColor="text-black"
                    buttonBackground="bg-primary"
                  >
                    Approve
                  </Button>
                )}
              </div>
            </article>
          </section>
        </div>
      </Layout>
      <Modal
        showModal={showStakeModal}
        onModalClose={() => setShowStakeModal(false)}
        size="lg:w-2/5"
      >
        <h2 className="text-h6 font-bold text-gray-800 mt-6 mb-8 text-center">
          Deposit {pool.title}
        </h2>
        <div className="flex items-center w-full">
          <input
            className=" appearance-none bg-gray-100 border rounded-primary w-full
      py-6 px-6 text-gray-900 text-body leading-tight focus:outline-none focus:shadow-outline"
            value={depositValue}
            onChange={e => {
              setDepositValue(e.target.value)
            }}
            placeholder={`Amount of ${pool.title} to deposit`}
          />
        </div>
        <div className="mt-10 flex justify-between items-center">
          <Button
            type="button"
            name="deposit"
            className="capitalize mb-2 font-bold"
            textColor="text-black"
            buttonBackground="bg-gray-200"
            onClick={() => setShowStakeModal(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            name="deposit"
            className="capitalize mb-2 font-bold"
            textColor="text-black"
            buttonBackground="bg-primary"
            onClick={onStakeHandler}
          >
            Stake
          </Button>
        </div>
      </Modal>
    </>
  )
}

export default PoolPage
