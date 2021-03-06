import React from 'react'
import {
  Route,
  Switch,
  useRouteMatch,
} from 'react-router-dom'
import { useWallet } from 'use-wallet'

import StaticsCards from "../Statics/componnents/StaticsCards"

import boxer from '../../assets/img/boxer.png'

import Button from '../../components/Button'
import Page from '../../components/Page'
import PageHeader from '../../components/PageHeader'

const Statics: React.FC = () => {
  const { path } = useRouteMatch()
  const { account, connect } = useWallet()
  return (
    <Switch>
      <Page>
      {!!account ? (
        <>
          <Route exact path={path}>
            <PageHeader
              icon={<img src={boxer} height="96" />}
              subtitle="Earn BENTO tokens by providing liquidity."
              title="Statistics"
            />
            <StaticsCards />
          </Route>
        </>
      ) : (
        <div style={{
          alignItems: 'center',
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
        }}>
          <Button
            onClick={() => connect('injected')}
            text="Unlock Wallet"
          />
        </div>
      )}
      </Page>
    </Switch>
  )
}


export default Statics
