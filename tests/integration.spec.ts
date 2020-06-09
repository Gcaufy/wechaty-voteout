#!/usr/bin/env ts-node

import {
  test,
}             from 'tstest'

import * as plugins from '../src/'

import {
  Wechaty,
}                               from 'wechaty'

import {
  PuppetMock,
}                 from 'wechaty-puppet-mock'
import {
  validatePlugin,
}                 from 'wechaty-plugin-contrib'

test.skip('integration testing', async (t) => {
  const bot = Wechaty.instance({
    puppet: new PuppetMock(),
  }).use(plugins.VoteOut())
  t.ok(bot, 'should get a bot')
})

test.skip('plugin name', async t => {
  for (const plugin of Object.values(plugins)) {
    if (typeof plugin !== 'function') {
      continue
    }

    if (plugin.name === 'validatePlugin') {
      continue  // our helper functions
    }

    // void validatePlugin
    t.doesNotThrow(() => validatePlugin(plugin), 'plugin ' + plugin.name + ' should be valid')
    // validatePlugin(plugin)
    // t.pass('ok')
  }
})
