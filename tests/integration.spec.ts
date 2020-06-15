#!/usr/bin/env ts-node

import {
  test,
}             from 'tstest'

import { VoteOut } from '../src/'

import {
  Wechaty,
}                               from 'wechaty'

import {
  PuppetMock,
}                 from 'wechaty-puppet-mock'

test.skip('integration testing', async (t) => {
  const VoteOutPlugin = VoteOut({ room: 'fake-id' })

  const bot = Wechaty.instance({
    puppet: new PuppetMock(),
  }).use(VoteOutPlugin)

  t.ok(bot, 'should get a bot')
})
