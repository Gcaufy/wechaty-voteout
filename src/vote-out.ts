/* eslint-disable brace-style */
import {
  Wechaty,
  Message,
  log,
  WechatyPlugin,
}                 from 'wechaty'

import {
  matchers,
  talkers,
}                         from 'wechaty-plugin-contrib'

import { getMentionText } from './get-mention-text'

import {
  DEFAULT_CONFIG,
  MustacheView,
  VoteOutConfig,
}                             from './config'

import * as store from './store'

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
  const talkKick   = talkers.roomTalker<MustacheView>(config.kick)

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
      const voter = message.from()

      if (!room)                                { return  }
      if (!voter)                               { return  }
      if (message.type() !== Message.Type.Text) { return  }

      const mentionList = await message.mentionList()
      if (!mentionList || mentionList.length <= 0)       { return }

      const mentionText = await message.mentionText()
      if (!isVoteUp(mentionText)
        && !isVoteDown(mentionText)
      )                                                   { return }

      if (!await isVoteManagedRoom(room))                 { return  }

      log.verbose('WechatyPluginContrib', 'VoteOut() on(message) %s in %s is voting %s', voter, room, mentionList.join(','))

      // We only support vote one contact now. others more than one will be ignored.
      const votee = mentionList[0]

      /**
       * Skip bot & whitelist-ed Votee
       */
      if (votee.id === message.wechaty.userSelf().id) { return }
      if (await isWhitelistContact(votee))            { return }

      /**
       * Check & set vote payload
       */
      const payload = store.get(room, votee)
      log.verbose('WechatyPluginContrib', 'VoteOut() on(message) vote payload: %s', JSON.stringify(payload))

      if (isVoteUp(mentionText)) {
        payload.upNum++
        payload.upIdList = [...new Set([
          ...payload.upIdList,
          voter.id,
        ])]
        store.set(room, votee, payload)

      } else if (isVoteDown(mentionText)) {
        payload.downNum++
        payload.downIdList = [...new Set(
          [
            ...payload.downIdList,
            voter.id,
          ],
        )]
        store.set(room, votee, payload)
      }

      /**
       * Build Mustache View
       */
      const upVoters = await getMentionText(
        [...payload.upIdList],
        room,
      )
      const downVoters = await getMentionText(
        [...payload.downIdList],
        room,
      )

      const view: MustacheView = {
        downEmoji : (config.downEmoji && config.downEmoji[0]) || DEFAULT_CONFIG.downEmoji![0],
        downNum   : payload.downNum,
        downVoters,

        threshold : config.threshold || DEFAULT_CONFIG.threshold!,

        upEmoji : config.upEmoji && config.upEmoji[0],
        upNum   : payload.upNum,
        upVoters,
      }

      /**
       * The voter has already voted the votee before
       */
      if (payload.downIdList.includes(voter.id)
        || payload.upIdList.includes(voter.id)
      ) {
        return talkRepeat(room, voter, view)
      }

      /**
       * Kick or Warn!
       */
      if (payload.downNum - payload.upNum >= config.threshold!) {
        await talkKick(room, votee, view)
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
