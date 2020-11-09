import { providers, BigNumber, BigNumberish, ethers } from 'ethers'

export namespace time {

    export const duration = {
        seconds: function (val: BigNumberish) { return BigNumber.from(val); },
        minutes: function (val: BigNumberish) { return BigNumber.from(val).mul(this.seconds('60')); },
        hours: function (val: BigNumberish) { return BigNumber.from(val).mul(this.minutes('60')); },
        days: function (val: BigNumberish) { return BigNumber.from(val).mul(this.hours('24')); },
        weeks: function (val: BigNumberish) { return BigNumber.from(val).mul(this.days('7')); },
        years: function (val: BigNumberish) { return BigNumber.from(val).mul(this.days('365')); },
    };

    export async function latest (provider:providers.JsonRpcProvider) {
        const block = await provider.getBlock('latest');
        return BigNumber.from(block.timestamp);
    }

    // Increases ganache time by the passed duration in seconds
    export async function increase(provider: providers.JsonRpcProvider, duration: BigNumberish) {
        if (!BigNumber.isBigNumber(duration)) {
            duration = BigNumber.from(duration)
        }

        if (duration.isNegative()) throw Error(`Cannot increase time by a negative amount (${duration})`)

        const resp = await provider.send('evm_increaseTime', [duration.toNumber()])

        await advanceBlock(provider)
        return resp
    }

    export async function advanceBlock(provider: providers.JsonRpcProvider) {
        return provider.send('evm_mine', [])
    }

    // Advance the block to the passed height
    export async function advanceBlockTo(provider: providers.JsonRpcProvider, target: BigNumberish) {
        if (!BigNumber.isBigNumber(target)) {
            target = BigNumber.from(target);
        }

        const currentBlock = await provider.getBlockNumber()
        const start = Date.now();
        let notified;
        if (target.lt(currentBlock)) throw Error(`Target block #(${target}) is lower than current block #(${currentBlock})`);
        while (target.gt(await provider.getBlockNumber())) {
            if (!notified && Date.now() - start >= 5000) {
                notified = true;
                console.warn(`advanceBlockTo: Advancing too many blocks is causing this test to be slow.`);
            }
            await advanceBlock(provider);
        }
    }
}

