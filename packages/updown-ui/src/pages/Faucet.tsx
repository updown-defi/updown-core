import React, { useContext, useState } from 'react'
import { Web3Context } from '../components/contexts/Web3Context'
import Layout from '../layouts/Layout/Layout'
import { useForm } from 'react-hook-form'
import Button from '../components/common/Button/Button'
import {FaucetFactory} from '../typed-contracts/FaucetFactory'
import { useWaitWithmessage } from '../components/hooks/waitWithMessage'
import { useHistory } from 'react-router-dom'

interface FaucetFormData {
  to: string
  code: string
}

export const FaucetPage: React.FC = () => {
  const {faucet, signer, addr, pools} = useContext(Web3Context)
  const { handleSubmit, register, errors } = useForm<FaucetFormData>()
  const [loading, setLoading] = useState(false)
  const waitWithMessage = useWaitWithmessage()
  const history = useHistory()

  const onSubmit = async ({code,to}: FaucetFormData) => {
    setLoading(true)
    console.log(`cashing in '${code}'`)
    const faucetContract = FaucetFactory.connect(faucet, signer!)
    try {
        await waitWithMessage("Using your code", faucetContract.cashIn(code, to))
        history.push(`/pools/${pools.pickles}`)
    } catch (err) {
        console.error("error on Tx: ", err)
    } finally {
        setLoading(false)
    }
  }

  return (
    <Layout>
      <div
        style={{ maxWidth: '1440px' }}
        className="flex w-full bg-opacity-25 items-center flex-col  pt-5 bg-gray-100 min-h-screen"
      >
        <img
          src="https://media.giphy.com/media/3uetGLYgad1OE/giphy.gif"
          alt="dripping faucet image"
        />
        {!loading && 
        <form onSubmit={handleSubmit(onSubmit)}>
          <label htmlFor="code" className="text-body">
            Code
          </label>
          <input
            name="code"
            ref={register({ required: true })}
            className="appearance-none bg-gray-100 border1 mr-8 rounded-primary w-full
      py-6 px-6 text-gray-900 text-body leading-tight focus:outline-none focus:shadow-outline mb-5"
            placeholder="Your Code"
          />
            <label htmlFor="code" className="text-body">
            Address to send the tokens
          </label>
          <input
            name="to"
            ref={register({ required: true })}
            className="appearance-none bg-gray-100 border1 mr-8 rounded-primary w-full
      py-6 px-6 text-gray-900 text-body leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Address to send the tokens"
            defaultValue={addr}
          />

          <Button
            type="submit"
            name="deposit"
            className="capitalize mb-2 font-bold"
            textColor="text-black"
            buttonBackground="bg-primary"
            padding="px-8 py-6 pr-12"
          >
            <span className="font-black inline-block">Redeem</span>
          </Button>
        </form>
        }
        {loading && <p>getting your tokens...</p>}
      </div>
    </Layout>
  )
}
