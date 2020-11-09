/* eslint-disable max-len */
import React from 'react'
import { BigNumber } from 'ethers'
import upPositionIcon from '../../../assets/image/icons/up-position.svg'
import downPositionIcon from '../../../assets/image/icons/down-position.svg'
import { toHuman } from '../../../lib/format'

const positionTypes = {
  UP: {
    icon: upPositionIcon,
    title: 'Ups',
    color: 'green',
  },
  DOWN: {
    icon: downPositionIcon,
    title: 'Downs',
    color: 'red',
  },
}

interface PositionInfoProps {
  type: 'UP' | 'DOWN',
  balance: BigNumber,
}

const PositionInfoCard: React.FC<PositionInfoProps> = ({ type, balance }) => {
  const positionProperties = positionTypes[type]

  return (
    <article className="w-2/4 flex flex-col items-center px-8">
      <div className="rounded-primary shadow-card w-full flex items-center px-8 py-8 ">

        <figure>
          <img alt="up-trend" src={positionProperties.icon} />
        </figure>

        <div className="px-6 flex-grow">
          <h2 className=" text-base font-semibold">{positionProperties.title}</h2>
          <p className="text-gray-800 text-h4 font-bold">
            {toHuman(balance)}
          </p>
        </div>

      </div>
    </article>
  )
}

export default PositionInfoCard
