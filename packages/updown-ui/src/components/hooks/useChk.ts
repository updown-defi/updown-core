import { BigNumber } from "ethers"
import { useContext, useEffect, useState } from "react"
import { CheckTokenFactory } from "../../typed-contracts"
import { Web3Context } from "../contexts/Web3Context"

interface CheckTokenInfo {
    loading: boolean
    balance?: BigNumber
    totalSupply?: BigNumber
}

export const useChk = ()=> {
    const {signer, CHK} = useContext(Web3Context)
    const [chkInfo, setChkInfo] = useState<CheckTokenInfo>()

    useEffect(()=> {
        const doAsync = async ()=> {
            if (!signer) {
                throw new Error("expected signer")
            }
            const chkContract = CheckTokenFactory.connect(CHK, signer)
            const balance = await chkContract.balanceOf(await signer.getAddress())
            const totalSupply = await chkContract.totalSupply()
            setChkInfo((s)=> {
                return {...s, loading: false, balance, totalSupply}
            })
        }

        if (signer && CHK) {
            doAsync()
        }
    }, [signer,CHK])

    return chkInfo
}