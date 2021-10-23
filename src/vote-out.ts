/* eslint-disable brace-style */
import {
  Wechaty,
  type,
  log,
  WechatyPlugin,
}                 from 'wechaty'

import {
  matchers,
  talkers,
}                         from 'wechaty-plugin-contrib'

import {
  MustacheView,
  getMustacheView,
}                         from './mustache-view.js'

import {
  DEFAULT_CONFIG,
  VoteOutConfig,
}                         from './config.js'

import * as store from './store.js'

export function VoteOut (config: VoteOutConfig): WechatyPlugin {
  log.verbose('WechatyPluginContrib', 'VoteOut(%s)', JSON.stringify(config))

  config = {
    ...DEFAULT_CONFIG,
    ...config,
  }

  store.init()

  const isVoteDown = (text: string): boolean => !!(config.downEmoji?.includes(text))
  const isVoteUp   = (text: string): boolean => !!(config.upEmoji?.includes(text))

  const isVoteManagedRoom  = matchers.roomMatcher(config.room)
  const isWhitelistContact = matchers.contactMatcher(config.whitelist)

  const talkRepeat = talkers.roomTalker<MustacheView>(config.repeat)
  const talkWarn   = talkers.roomTalker<MustacheView>(config.warn)
  const talkKick   = talkers.messageTalker<MustacheView>(config.kick)

  return function VoteOutPlugin (wechaty: Wechaty) {
    log.verbose('WechatyPluginContrib', 'VoteOut() VoteOutPlugin(%s)', wechaty)

    let lastPrune = 0
    const oneDay = 24 * 3600 * 1000 // 1 day
    wechaty.on('heartbeat', () => {
      if (Date.now() - lastPrune > oneDay) {
        // Prune the expired cache. other wise it can only be removed from get
        store.prune()
        lastPrune = Date.now()
      }
    })

    wechaty.on('message', async message => {
      log.silly('WechatyPluginContrib', 'VoteOut() on(message) %s', message)

      /**
       * Validate Vote Message
       */
      const room  = message.room()
      const voter = message.talker()

      if (!room)                                { return  }
      // if (!voter)                               { return  }
      if (message.type() !== type.Message.Text) { return  }

      const mentionList = await message.mentionList()
      if (mentionList.length <= 0)              { return }

      const text = await message.mentionText()
      if (!isVoteUp(text)
        && !isVoteDown(text)
      )                                                   { return }

      if (!await isVoteManagedRoom(room))                 { return  }

      log.verbose('WechatyPluginContrib', 'VoteOut() on(message) %s in %s is voting %s', voter, room, mentionList.join(','))

      // We only support vote one contact now. others more than one will be ignored.
      const votee = mentionList[0]
      if (!votee) { return }

      /**
       * Skip bot & whitelist-ed Votee
       */
      if (votee.id === message.wechaty.currentUser().id) { return }
      if (await isWhitelistContact(votee))            { return }

      /**
       * Check & set vote payload
       */
      let payload = store.get(room, votee)
      log.verbose('WechatyPluginContrib', 'VoteOut() on(message) payload for votee %s is %s',
        votee,
        JSON.stringify(payload),
      )

      /**
       * The voter has already voted the votee before
       */
      if (payload.downIdList.includes(voter.id)
        || payload.upIdList.includes(voter.id)
      ) {
        const view = await getMustacheView(
          config,
          payload,
          room,
          votee,
        )
        return talkRepeat(room, voter, view)
      }

      /**
       * Update payload
       */
      if (isVoteUp(text)) {
        payload = {
          ...payload,
          upIdList: [...new Set([
            ...payload.upIdList,
            voter.id,
          ])],
          upNum: payload.upNum + 1,
        }
        store.set(room, votee, payload)

      } else if (isVoteDown(text)) {
        payload = {
          ...payload,
          downIdList: [...new Set(
            [
              ...payload.downIdList,
              voter.id,
            ],
          )],
          downNum: payload.downNum + 1,
        }
        store.set(room, votee, payload)
      }

      /**
       * Kick or Warn!
       */
      const view = await getMustacheView(
        config,
        payload,
        room,
        votee,
      )

      if (payload.downNum - payload.upNum >= config.threshold!) {
        await talkKick(message, view)
        if (await room.has(votee)) {
          await room.del(votee)
        }
        store.del(room, votee)
      } else {
        await talkWarn(room, votee, view)
      }

    })
  }

}
