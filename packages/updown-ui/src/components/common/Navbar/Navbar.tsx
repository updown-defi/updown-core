import React, { useContext, useEffect, useState } from 'react'
import classNames from 'classnames'
import { Link, useLocation } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import logoSrc from '../../../assets/image/logo/logo.svg'
import { Web3Context } from '../../contexts/Web3Context'
import PageLink from '../PageLink/PageLink'
import { useBlockNumber } from '../../hooks/useBlockNumber'
import { PendingTxContext } from '../../contexts/PendingTxContext'
import { usePool } from '../../hooks/usePool'
import { toHuman } from '../../../lib/format'

declare const window: any

const navLinks = [
  {
    title: 'Play',
    href: '/',
    path: '/'
  },
  // TODO: commented out for mainnet for now
  // {
  //   title: 'Farm',
  //   href: '/farm',
  //   path: '/farm'
  // }
]

const Navbar = () => {
  const { pathname } = useLocation()
  const { count: pendingTxCount } = useContext(PendingTxContext)
  const { provider, addr } = useContext(Web3Context)
  const blockNumber = useBlockNumber(provider)
  const [upSupply, setUpSupply] = useState('')
  const [downSupply, setDownSupply] = useState('')

  const { poolAddress } = useParams<{ poolAddress: string }>()

  const pool = usePool(poolAddress)
  window.pool = pool
  const { up, down } = pool

  const getTotalSupply = async () => {
    try {
      const upSupply = await down?.totalSupply()
      const downSupply = await up?.totalSupply()
      setUpSupply(toHuman(upSupply || 0))
      setDownSupply(toHuman(downSupply || 0))
    } catch (error) {
      throw error
    }
  }

  useEffect(() => {
    if (poolAddress) {
      getTotalSupply()
    }
  }, [poolAddress, blockNumber])

  return (
    <header
      style={{
        backgroundColor: '#F4E5CC'
      }}
      className="w-full flex px-40 py-6 bg-gray-100 shadow-sm items-center justify-between"
    >
      <Link to="/">
        <img alt="logo" src={logoSrc} />
      </Link>

      <div className="px-20">
        {navLinks.map(({ title, href, path }) => (
          <PageLink
            key={title}
            to={href}
            className={classNames(
              'text-body font-bold pr-8 text-gray-600',
              path === pathname && 'text-gray-900'
            )}
            title={title}
          >
            {title}
          </PageLink>
        ))}
      </div>

      <div className="items-center flex flex-grow justify-end">
        <div className="flex items-center mr-8">
          <span className="text-small-text text-gray-600 font-semibold inline-block mr-2">
            Total supply of ups / downs
          </span>
          <p className="text-small-text text-gray-900 font-bold">
            : {upSupply} / {downSupply}
          </p>
        </div>

        <div className="flex text-base mr-8">
          <span className="flex h-4 w-4 relativem mr-2" />
          <span className="text-gray-600 pr-2">Current Block:</span>
          <p className="text-gray-900 font-bold">{blockNumber}</p>
        </div>

        <div className="flex text-base">
          <span className="flex h-4 w-4 relative mr-2 mt-2">
            {Number(pendingTxCount) > 0 && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
              </>
            )}
          </span>
          <span className="text-gray-600 pr-2 font-regular">
            Pending Transactions:
          </span>
          <p className="text-gray-900 font-bold">{pendingTxCount}</p>
        </div>
      </div>
    </header>
  )
}
export default Navbar
