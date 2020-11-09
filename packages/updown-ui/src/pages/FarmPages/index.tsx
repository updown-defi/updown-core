/* eslint-disable max-len */
import React, { useContext } from 'react'
import { utils, BigNumber } from 'ethers'
import { Link } from 'react-router-dom'
import Layout from '../../layouts/Layout/Layout'
import addIcon from '../../assets/image/icons/add.svg'
import purpleIllustration from '../../assets/image/illustrations/purple-thing.svg'
import availablePools from '../../data/availablePools'
import { Web3Context } from '../../components/contexts/Web3Context'
import { useFarm } from '../../components/hooks/useFarm'
import { useChk } from '../../components/hooks/useChk'
import { toHuman } from '../../lib/format'

const FarmIndexPage = () => {
  const ctx = useContext(Web3Context)
  const pools = availablePools(ctx)
  const farm0 = useFarm(0)
  const farm1 = useFarm(1)

  const chk = useChk()

  const loading = farm0.loading || farm1.loading

  if (loading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1440px' }} className="px-40 pt-24 pb-32 flex flex-col items-center">
          <h1 className=" text-h4 text-gray-900 font-bold text-center">
            Loading...
          </h1>
        </div>

      </Layout>
    )
  }

  const farmCount = [farm0, farm1].reduce((cnt, farm) => {
    if (parseFloat(utils.formatEther(farm.staked!.toString())) > 0) {
      return cnt + 1
    }
    return cnt
  }, 0)

  const pendingCount = [farm0, farm1].reduce((cnt, farm) => {
    return cnt.add(farm.pendingChk || 0)
  }, BigNumber.from(0))

  return (
    <Layout>
      <div style={{ maxWidth: '1440px' }} className="px-40 pt-24 pb-32 flex flex-col items-center">

        <section className=" mb-48 w-full">
          <h1 className=" text-h4 text-gray-900 font-bold text-center">
            Staking in {farmCount} farms
          </h1>

          <section className="flex justify-center w-full">
            <article className="w-2/5 flex items-center shadow-card px-8 py-10 rounded-primary mr-16">
              <img alt="illustraton" src={purpleIllustration} />
              <div className="flex-grow ml-8 ">
                <h2>
                  Your CHK balance
                </h2>
                <p className="text-gray-800 text-h4 font-bold">{chk?.loading ? '?' : toHuman(chk?.balance || 0)}</p>

                <div className="flex justify-between text-small-text">
                  <span>Pending harvest</span>
                  <p>{toHuman(pendingCount)}</p>
                </div>
              </div>
            </article>

            <article className="w-2/5 flex items-center shadow-card px-8 py-10 rounded-primary">
              <div className="flex-grow ml-8 ">
                <h2>
                  Total CHK Supply
                </h2>
                <p className="text-gray-800 text-h4 font-bold">{toHuman(chk?.totalSupply || 0)}</p>
              </div>
            </article>
          </section>
        </section>

        <section>
          <h2 className="text-h5 font-bold text-gray-900 text-center">
            Select a pool
          </h2>
          <h3 className="mb-16 text-body text-center text-gray-800">
            Earn CHK tokens by staking Uniswap V2 LP Tokens.
          </h3>

          <section className="flex w-full justify-center">
            {
              pools.map(({ address, title, background }) => (
                <article
                  key={title}
                  className="w-1/3 px-4"
                >

                  <div
                    style={{
                      background: `url(${background})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: 'cover',
                      height: '350px',
                      borderRadius: '16px',
                    }}
                    className=" pt-32 overflow-hidden pb-10 px-10 flex justify-between items-center flex-col"
                  >

                    <p className="text-white text-center text-h5 font-bold">
                      {title}
                    </p>

                    <Link
                      className="flex items-center px-6 py-4 rounded-primary cursor-pointer hover:bg-black hover:bg-opacity-25"
                      to={`/farm/pool/${address}`}
                    >
                      <img alt="add icon" src={addIcon} />

                      <span className="inline-block ml-4 font-bold text-white text-body">
                        Select
                      </span>

                    </Link>
                  </div>
                </article>
              ))
            }
          </section>
        </section>

      </div>

    </Layout>
  )
}

export default FarmIndexPage
