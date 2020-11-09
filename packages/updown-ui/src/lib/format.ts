import { ChainId, Token, TokenAmount } from '@uniswap/sdk'
import { BigNumberish, BigNumber, utils } from 'ethers';

export function toHuman(amount:BigNumberish) {
    const fakeToken = new Token(ChainId.GÖRLI, '0x0000000000000000000000000000000000000000', 18)
    const str = new TokenAmount(fakeToken, BigNumber.from(amount).toString()).toFixed(4)
    return utils.commify(str)
}