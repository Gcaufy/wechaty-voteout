#!/usr/bin/env ts-node

import test  from 'tstest'

import {
  Room,
}                   from 'wechaty'

import {
  matchRoomConfig,
  RoomOptions,
  VoteOutConfig,
}                     from './wechaty-voteout'

test('matchRoomConfig()', async t => {
  const EXPECTED_TEXT = 'text'

  const OPTIONS_TEXT: RoomOptions     = EXPECTED_TEXT
  const OPTIONS_REGEXP: RoomOptions   = new RegExp('^' + EXPECTED_TEXT + '$')

  const EXPECTED_ROOM = {
    id: EXPECTED_TEXT,
    topic: () => EXPECTED_TEXT,
  } as any as Room

  const UNEXPECTED_ROOM = {
    id: EXPECTED_TEXT + 'fadfasdf',
    topic: () => EXPECTED_TEXT + 'xxxxfdasfsd',
  } as any as Room

  t.true(await matchRoomConfig({ room: OPTIONS_TEXT } as VoteOutConfig)(EXPECTED_ROOM), 'should match for text by text')
  t.false(await matchRoomConfig({ room: OPTIONS_TEXT } as VoteOutConfig)(UNEXPECTED_ROOM), 'should not match for text + xx by text')

  t.true(await matchRoomConfig({ room: [ OPTIONS_TEXT ] } as VoteOutConfig)(EXPECTED_ROOM), 'should match for text by text array')
  t.false(await matchRoomConfig({ room: [ OPTIONS_TEXT ] } as VoteOutConfig)(UNEXPECTED_ROOM), 'should not match for text + xx by text array ')

  t.true(await matchRoomConfig({ room: OPTIONS_REGEXP } as VoteOutConfig)(EXPECTED_ROOM), 'should match for text by regexp')
  t.false(await matchRoomConfig({ room: OPTIONS_REGEXP } as VoteOutConfig)(UNEXPECTED_ROOM), 'should not match for text + xx by regexp')

  t.true(await matchRoomConfig({ room: [ OPTIONS_REGEXP ] } as VoteOutConfig)(EXPECTED_ROOM), 'should match for text by regexp array')
  t.false(await matchRoomConfig({ room: [ OPTIONS_REGEXP ] } as VoteOutConfig)(UNEXPECTED_ROOM), 'should not match for text + xx by regexp array')
})
