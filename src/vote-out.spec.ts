#!/usr/bin/env ts-node

import test  from 'tstest'

import {
  validatePlugin,
}                   from 'wechaty-plugin-contrib'

import {
  VoteOut,
}                     from './vote-out'

test('VoteOut()', async t => {
  t.doesNotThrow(() => validatePlugin(VoteOut), 'should pass the validation')
})
