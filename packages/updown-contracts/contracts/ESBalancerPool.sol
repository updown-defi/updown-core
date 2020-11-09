// SPDX-License-Identifier: GNUV3

pragma solidity 0.6.12;

// Needed to handle structures externally
pragma experimental ABIEncoderV2;

// Imports
import "configurable-rights-pool/contracts/ConfigurableRightsPool.sol";
// import "hardhat/console.sol";

/**
 * @author Ampleforth engineering team & Balancer Labs
 *
 * Reference:
 * https://github.com/balancer-labs/configurable-rights-pool/blob/master/contracts/templates/ElasticSupplyPool.sol
 *
 * @title Ampl Elastic Configurable Rights Pool.
 *
 * @dev   Extension of Balancer labs' configurable rights pool (smart-pool).
 *        Amples are a dynamic supply tokens, supply and individual balances change daily by a Rebase operation.
 *        In constant-function markets, Ampleforth's supply adjustments result in Impermanent Loss (IL)
 *        to liquidity providers. The AmplElasticCRP is an extension of Balancer Lab's
 *        ConfigurableRightsPool which mitigates IL induced by supply adjustments.
 *
 *        It accomplishes this by doing the following mechanism:
 *        The `resyncWeight` method will be invoked atomically after rebase through Ampleforth's orchestrator.
 *
 *        When rebase changes supply, ampl weight is updated to the geometric mean of
 *        the current ampl weight and the target. Every other token's weight is updated
 *        proportionally such that relative ratios are same.
 *
 *        Weights: {w_ampl, w_t1 ... w_tn}
 *
 *        Rebase_change: x% (Ample's supply changes by x%, can be positive or negative)
 *
 *        Ample target weight: w_ampl_target = (100+x)/100 * w_ampl
 *
 *        w_ampl_new = sqrt(w_ampl * w_ampl_target)  // geometric mean
 *        for i in tn:
 *           w_ti_new = (w_ampl_new * w_ti) / w_ampl_target
 *
 */
contract ESBalancerPool is ConfigurableRightsPool {
    constructor(
        address factoryAddress,
        PoolParams memory poolParams,
        RightsManager.Rights memory rightsStruct
    )
    public
    ConfigurableRightsPool(factoryAddress, poolParams, rightsStruct) {

        require(rights.canChangeWeights, "ERR_NOT_CONFIGURABLE_WEIGHTS");

    }

    uint constant baseWeight = 20 * 10**18; 

    function updateWeight(address token, uint newWeight)
        external
        logs
        onlyOwner
        needsBPool
        override
    {
        revert("ERR_UNSUPPORTED_OPERATION");
    }

    function updateWeightsGradually(
        uint[] calldata newWeights,
        uint startBlock,
        uint endBlock
    )
        external
        logs
        onlyOwner
        needsBPool
        override
    {
        revert("ERR_UNSUPPORTED_OPERATION");
    }

    function pokeWeights()
        external
        logs
        needsBPool
        override
    {
       revert("ERR_UNSUPPORTED_OPERATION");
    }

    /*
     * @dev 
     *       simplification of Ampleforth's resyncWeight for our UpDown usecase. Takes up and down addresses
     *       and adjusts weight to the current supply.
     *      The underlying BPool enforces bounds on MIN_WEIGHTS=1e18, MAX_WEIGHT=50e18 and TOTAL_WEIGHT=50e18.
     *      NOTE: The BPool.rebind function CAN REVERT if the updated weights go beyond the enforced bounds.
     */
    function resyncWeights(address up, address down)
        external
        logs
        lock
        needsBPool
    {

        // NOTE: Skipping gradual update check
        // Pool will never go into gradual update state as `updateWeightsGradually` is disabled
        // require(
        //     ConfigurableRightsPool.gradualUpdate.startBlock == 0,
        //     "ERR_NO_UPDATE_DURING_GRADUAL");

        require(
            bPool.isBound(up),
            "ERR_NOT_BOUND");
        require(
            bPool.isBound(down),
            "ERR_NOT_BOUND");

        uint upTotal = IERC20(up).totalSupply();
        uint downTotal = IERC20(down).totalSupply();
        uint total = BalancerSafeMath.badd(upTotal,downTotal);

        uint targetUpWeight = BalancerSafeMath.bdiv(BalancerSafeMath.bmul(baseWeight, upTotal),total);
        uint targetDownWeight = BalancerSafeMath.bdiv(BalancerSafeMath.bmul(baseWeight, downTotal),total);

        // // sync balance
        bPool.gulp(up);
        bPool.gulp(down);

        // get new balance
        uint upBalanceAfter = bPool.getBalance(up);
        uint downBalanceAfter = bPool.getBalance(down);

        bPool.rebind(up, upBalanceAfter, targetUpWeight);
        bPool.rebind(down, downBalanceAfter, targetDownWeight);
    }
}