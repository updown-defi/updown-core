import React, { ReactChild, useContext } from 'react'
import Button from '../../components/common/Button/Button'
import Navbar from '../../components/common/Navbar/Navbar'
import { Web3Context } from '../../components/contexts/Web3Context'
import angryEmoji from '../../assets/image/icons/emoji/angry.svg'

interface LayoutProps {
  children: ReactChild
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { connected, connect } = useContext(Web3Context)

  return (
    <>
      <Navbar />
      <div className="flex justify-center flex-col items-center">
        <div
          className="mt-12 flex items-center rounded-16 bg-gray-100 pl-6 pr-6"
        >
          <img src={angryEmoji} alt="warning" />
          <p className=" text-body text-gray-900 font-semibold rounded-lg p-5">
            This project is in beta. Use at your own risk.
          </p>
        </div>
        {connected ? (
          children
        ) : (
          <div className="mt-32">
            <Button
              type="button"
              name="Connect"
              onClick={() => {
                connect().catch((err) => {
                  if (err && err.code) {
                    alert(`${err.code}: ${err.reason}`)
                  }
                  console.error("error connecting: ", err)
                })
              }}
              className="capitalize"
              textColor="text-black"
              buttonBackground="bg-primary"
            >
              Connect Wallet
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

export default Layout
