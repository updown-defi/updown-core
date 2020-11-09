// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import './interfaces/IPriceOracleGetter.sol';
import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
Don't use this thing, don't
it uses the spot price of Uniswap - that's a BAAAAD idea.

 */
contract YOLOracle is IPriceOracleGetter {

    address public weth;
    address public factory = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;

    constructor(address weth_, address factory_) public {
        if (factory_ != address(0)) {
            factory = factory_;
        }
        weth = weth_;
    }

    function getAssetPrice(address underlying) override external view returns (uint256) {
        (address sortA, address sortB) = UniswapV2Library.sortTokens(underlying,weth);
        // fetches and sorts the reserves for a pair
        (uint reserveA, uint reserveB) = UniswapV2Library.getReserves(factory, sortA, sortB);
        uint underlyingReserve = reserveA;
        uint wethReserve = reserveB;
        if (underlying != sortA) {
            underlyingReserve = reserveB;
            wethReserve = reserveA;
        }

        return UniswapV2Library.quote(10**18, underlyingReserve, wethReserve);
    }
}
