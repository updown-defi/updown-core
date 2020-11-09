import { Web3ContextData } from '../components/contexts/Web3Context'

import blueBg from '../assets/image/backgrounds/pools/blue.svg'
import blackBg from '../assets/image/backgrounds/pools/black.svg'

export default (ctx: Web3ContextData) => {
  return [
    {
      title: '1wk DAI tracking YFI/ETH',
      background: blueBg,
      color: 'green',
      address: ctx.pools.yfi,
      symbol: 'YFI',
      queenPID: 0,
      multiplier: 2,
      message: `
      This pool uses the AAVE price oracle and one week epochs to track the price movement of YFI (denominated in ETH).
      `
    },
    {
      title: '15min UNI tracking PICKLES/ETH',
      background: blackBg,
      color: 'blue',
      address: ctx.pools.pickles,
      symbol: 'PICKLE',
      queenPID: 1,
      multiplier: 3,
      message: `
      Warning: this pools is Degen and for experimentation. It uses 15 minute epochs and the Uniswap *spot* price (dangerous).
      Deposit UNI to profit or lose based on the price of PICKLE (denominiated in ETH).
      `
    }
  ]
}
