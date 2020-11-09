import { Link } from 'react-router-dom'
import React, { useContext } from 'react'
import { Web3Context } from '../components/contexts/Web3Context'
import Layout from '../layouts/Layout/Layout'
import availablePools from '../data/availablePools'

const PoolComponent: React.FC<{
  pool: ReturnType<typeof availablePools>[0]
}> = ({ pool }) => {
  return (
    <article className="w-1/4 px-6" key={pool.address}>
      <Link className="cursor-pointer" to={`/pools/${pool.address}`}>
        <div
          style={{
            background: `url(${pool.background})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            minHeight: '450px',
            borderRadius: '16px',
          }}
          className="overflow-hidden px-10 pt-16 flex pb-24 justify-between items-center flex-col"
        >
          <h2 className="text-white text-center text-h6 font-black">
            {pool.title}
          </h2>
          <p className="text-white pt-4 text-center text-body">
            {pool.message}

            <span className="block pt-3">
              {pool.multiplier}x multiplier
            </span>
          </p>

          <span className="inline-block ml-4 mt-10 font-bold text-white text-body">
            Select {pool.symbol} Pool
          </span>
        </div>
      </Link>
    </article>
  )
}

const IndexPage: React.FC = () => {
  const ctx = useContext(Web3Context)
  const pools = availablePools(ctx)

  return (
    <Layout>
      <div
        style={{ maxWidth: '1440px' }}
        className="flex w-full bg-opacity-25 items-center flex-col  pt-5 bg-gray-100 min-h-screen"
      >
        <h2 className="text-h4 font-bold text-gray-800 mt-6 mb-16 text-center">
          Choose your pool
        </h2>

        <section className="flex w-full justify-center">
          {pools.map((p) => <PoolComponent key={p.address} pool={p} />)}
        </section>
      </div>
    </Layout>
  )
}

export default IndexPage
