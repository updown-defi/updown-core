## Ethereum Smart Contracts for UpDown Token

### Option Pools
Each UpDown pool is managed by its own contract: [`OptionsPool.sol`](./packages/updown-contracts/contracts/OptionsPool.sol). Each instance of a pool contains the following attributes:

| Attribute | Description |
|---|---|
| Payout Token | External ERC20 token that is exchanged for Ups/Downs (deposited and withdrawn). |
| Underlying Token | External ERC20 token to price track, always denominated in ETH (ex: [YFI/ETH](https://info.uniswap.org/pair/0x2fdbadf3c4d5a8666bc06645b8358ab803996e28)). |
| Price Oracle | Smart contract providing a feed of the underlying token's price. |
| Price Multiplier |  Multiplier for price movements: for instance, given a 5x Multiplier, a 1% price movement of the tracked token will result in a 5% change in Ups and Downs. |
| Up/Down Token Pair | 2 individual ERC20 tokens that create the Up Down market (more below). |

### Up / Down Tokens
Each Up token and Down token is its own ERC20 contract: [`RebaseableToken.sol`](./packages/updown-contracts/contracts/RebaseableToken.sol). RebaseableToken is heavily based on the Ampleforth contract and allows rebasing the total supply. The OptionsPool contract is responsible for rebasing these tokens based on price changes of the underlying pair. The inverse coupling of Up and Down tokens together results in a market where an increase / positive rebase in Ups results in an equal decrease / negative rebase in Downs. Each Up/Down pair is published to uniswap and liquidity is incentivized using the Queen/CHK contracts. 
