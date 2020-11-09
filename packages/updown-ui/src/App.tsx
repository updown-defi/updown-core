import React from 'react'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { Web3Provider } from './components/contexts/Web3Context'
import FarmIndexPage from './pages/FarmPages'
import FarmPool from './pages/FarmPages/pool'
import IndexPage from './pages/IndexPage'
import PoolPage from './pages/PoolPage'
import { ToastProvider } from 'react-toast-notifications'
import { PendingTxProvider } from './components/contexts/PendingTxContext'
import { FaucetPage } from './pages/Faucet'

function App() {
  return (
    <ToastProvider>
      <Web3Provider>
        <PendingTxProvider>
          <HashRouter>
            <Switch>
              <Route path="/farm/pool/:poolAddress" component={FarmPool} />
              <Route path="/farm" component={FarmIndexPage} />
              <Route path="/faucet" component={FaucetPage} />
              <Route path="/pools/:poolAddress" component={PoolPage} />
              <Route path="/" component={IndexPage} />
            </Switch>
          </HashRouter>
        </PendingTxProvider>
      </Web3Provider>
    </ToastProvider>
  )
}

export default App
