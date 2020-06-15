#!/usr/bin/env ts-node

import test  from 'tstest'

import * as store from './store'
import { Room, Contact } from 'wechaty'

test('store.* smoke testing', async t => {
  store.init()

  const room1 = { id: '18673011105@chatroom' } as any as Room
  const votee1 = { id: 'wxid_a8d806dzznm822' } as any as Contact
  const votee2 = { id: 'wxid_a8d806dzznm8ab' } as any as Contact

  let payload1 = store.get(room1, votee1)
  t.equal(payload1.downIdList.length, 0, 'should be 0 for downIdList.length')
  t.equal(payload1.downNum, 0, 'should get downNum 0')
  t.equal(payload1.upIdList.length, 0, 'should be 0 for upIdList.length')
  t.equal(payload1.upNum, 0, 'should get upNum 0')

  payload1 = {
    ...payload1,
    downIdList: [ '1' ],
    downNum: 1,
  }
  store.set(room1, votee1, payload1)

  let payload2 = store.get(room1, votee1)
  t.equal(payload2.downIdList.length, 1, 'should be 1 for downIdList.length')
  t.equal(payload2.downNum, 1, 'should get downNum 1')
  t.equal(payload2.upIdList.length, 0, 'should be 0 for upIdList.length')
  t.equal(payload2.upNum, 0, 'should get upNum 0')

  let payload3 = store.get(room1, votee2)
  t.equal(payload3.downIdList.length, 0, 'should be 0 for downIdList.length')
  t.equal(payload3.downNum, 0, 'should get downNum 0')
  t.equal(payload3.upIdList.length, 0, 'should be 0 for upIdList.length')
  t.equal(payload3.upNum, 0, 'should get upNum 0')
})
