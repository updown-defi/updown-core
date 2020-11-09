#!/usr/bin/env bash

typechain \
    '{artifacts/{contracts,@uniswap,@openzeppelin}/!(test)/**/+([a-zA-Z0-9]).json,./node_modules/@uniswap/v2-periphery/build/UniswapV2Router02.json,./node_modules/@uniswap/v2-core/build/IUniswapV2Pair.json,./node_modules/@uniswap/v2-core/build/IUniswapV2Factory.json,./node_modules/@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json}' \
    --target ethers-v5 --show-stack-traces