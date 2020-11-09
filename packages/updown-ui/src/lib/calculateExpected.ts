import { BigNumber } from 'ethers'

export const calculateExpected = (
    upBalance: BigNumber,
    downBalance: BigNumber,
    startPrice: BigNumber,
    currentPrice: BigNumber
  ) => {
    if (
      upBalance.add(downBalance).eq(0) ||
      startPrice.eq(0) ||
      currentPrice.eq(0)
    ) {
      return BigNumber.from(0)
    }
  
    let diff = currentPrice.sub(startPrice)
    const isUp = diff.gt(0)
    if (diff.lt(0)) {
      diff = diff.mul(-1)
    }
  
    const one = BigNumber.from((1e18).toString()) // not sure why we need toString here, but otherwise it overflows
  
    // calculate the percent change defined as an 18 precision decimal (1e18 is 100%)
    const percent = diff
      .mul(one)
      .mul(one)
      .div(startPrice.mul(one))
  
    if (isUp) {
      return upBalance
        .mul(one.add(percent))
        .add(downBalance.mul(one.sub(percent)))
        .div(200)
        .div(one)
    }
  
    return downBalance
      .mul(one.add(percent))
      .add(upBalance.mul(one.sub(percent)))
      .div(200)
      .div(one)
  }