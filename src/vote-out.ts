/* eslint-disable brace-style */
import {
  Wechaty,
  Message,
  Room,
  Contact,
  log,
  WechatyPlugin,
}                 from 'wechaty'
import LRUCache  from 'lru-cache'

import {
  RoomMatcherOptions,
  ContactMatcherOptions,
  RoomTalkerOptions,
  MessageTalkerOptions,
  roomTalker,
  messageTalker,
  roomMatcher,
  contactMatcher,
}                         from 'wechaty-plugin-contrib/dist/src/utils'

import { DEFAULT_VOTE_OUT_CONFIG } from './default-vote-out-config'

const EMOJI_THUMB_UP    = '[ThumbsUp]'
const EMOJI_THUMB_DOWN  = '[ThumbsDown]'

export interface VoteOutConfig {
  room: RoomMatcherOptions,

  threshold? : number,
  whitelist? : ContactMatcherOptions,
  voteUp?    : string[]
  voteDown?  : string[],

  warn?   : RoomTalkerOptions,
  kick?   : RoomTalkerOptions,
  repeat? : MessageTalkerOptions,
}

interface VotePayload {
  downCounter : number,
  downIdList  : string[],

  upCounter : number,
  upIdList  : string[],
}

const INITIAL_PAYLOAD: VotePayload = {
  downCounter : 0,
  downIdList  : [],
  upCounter   : 0,
  upIdList    : [],
}

export function VoteOut (config: VoteOutConfig): WechatyPlugin {
  log.verbose('WechatyPluginContrib', 'VoteOut(%s)', JSON.stringify(config))

  config = {
    ...DEFAULT_VOTE_OUT_CONFIG,
    ...config,
  }

  const lruOptions: LRUCache.Options<string, VotePayload> = {
    // length: function (n) { return n * 2},
    dispose (key, val) {
      log.silly('WechatyPluginContrib', 'VoteOut lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
    },
    max: 1000,
    maxAge: 60 * 60 * 1000,
  }

  const lruCache = new LRUCache<string, VotePayload>(lruOptions)

  const isVoteDown = (text: string): boolean => !!(config.voteDown?.includes(text))
  const isVoteUp   = (text: string): boolean => !!(config.voteUp?.includes(text))

  const getVoteKey     = (room: Room, votee: Contact) => `${room.id}-${votee.id}-vote`
  const getVotePayload = (room: Room, votee: Contact): VotePayload => lruCache.get(getVoteKey(room, votee)) || INITIAL_PAYLOAD
  const setVotePayload = (room: Room, votee: Contact, payload?: VotePayload) => {
    const key = getVoteKey(room, votee)
    if (payload)  { lruCache.set(key, payload) }
    else          { lruCache.del(key) }
  }

  const isVoteManagedRoom  = roomMatcher(config.room)
  const isWhitelistContact = contactMatcher(config.whitelist)
  const roomTalkRepeat = messageTalker(config.repeat)

  async function doVoteDown (
    room  : Room,
    voter : Contact,
    votee : Contact,
  ): Promise<void> {
    const payload = getVotePayload(room, votee)

    const voted = await hadVoted(
      payload.downIdList,
      voter,
      votee,
      room,
    )

    if (voted) {
      return
    }

    payload.downCounter++
    payload.downIdList = [...new Set(
      [
        ...payload.downIdList,
        voter.id,
      ],
    )]
    setVotePayload(room, votee, payload)

    await sayVoteStatus(payload, votee, room)

    if (payload.downCounter - payload.upCounter >= config.threshold!) {

      executeKick(payload, room, votee)
        .catch(e => log.error('WechatyPluginContrib', 'VoteOut() executeKick() rejection: %s', e))

      setVotePayload(room, votee, undefined)  // del
    }
  }

  async function doVoteUp (
    room: Room,
    voter: Contact,
    votee: Contact
  ): Promise<void> {
    const payload = getVotePayload(room, votee)

    const voted = await hadVoted(
      payload.upIdList,
      voter,
      votee,
      room,
    )

    if (voted) {
      return
    }

    payload.upCounter++
    payload.upIdList = [...new Set([
      ...payload.upIdList,
      voter.id,
    ])]
    setVotePayload(room, votee, payload)

    await sayVoteStatus(payload, votee, room)
  }

  async function mentionTextFromContactIdList (
    idList: string[],
    room: Room,
  ) {
    const uniqIdList = [...new Set([...idList])]

    const contactList = uniqIdList.map(
      id => room.wechaty.Contact.load(id)
    )
    await Promise.all(
      contactList.map(c => c.ready())
    )
    const mentionList = contactList.map(c => c.name())
    const mentionText = '@' + mentionList.join(' @')
    return mentionText
  }

  async function hadVoted (
    voterIdList: string[],
    voter: Contact,
    target: Contact,
    room: Room,
  ) {
    const hasVoted = voterIdList.includes(voter.id)
    if (!hasVoted) {
      return false
    }

    await roomTalkRepeat(room, voter)
    return true
  }

  async function sayVoteStatus (
    payload: VotePayload,
    target: Contact,
    room: Room,
  ): Promise<void> {
    // let emoji: string
    // switch (payload.downCounter) {
    //   case 0:
    //   case 1:
    //     emoji = '[Awkward]'
    //     break
    //   case 2:
    //     emoji = '[Panic]'
    //     break
    //   case 3:
    //     emoji = '[Angry]'
    //     break
    //   default:
    //     emoji = '[Bomb]'
    // }

    const numUp = payload.upCounter
    const numDown = payload.downCounter

    const upVotersMentionText = await mentionTextFromContactIdList(
      [...payload.upIdList],
      room,
    )
    const downVotersMentionText = await mentionTextFromContactIdList(
      [...payload.downIdList],
      room,
    )

    const voteStatus = `${EMOJI_THUMB_DOWN}-${numDown} | +${numUp}${EMOJI_THUMB_UP}`
    // const voteInfo = `The one who has been voted nagitive by three people will be removed from the room as an unwelcome guest.`
    const horizontalLine = '———————————'
    const voteRule = `The one who has been voted ${EMOJI_THUMB_DOWN} by three people will be removed from the room as an unwelcome guest.`
    let voteInfo = `${horizontalLine}\n${voteRule}\n\n`

    if (payload.upIdList.length) {
      voteInfo += `${EMOJI_THUMB_UP} By ${upVotersMentionText}\n`
    }
    if (payload.downIdList.length) {
      voteInfo += `${EMOJI_THUMB_DOWN} By ${downVotersMentionText}\n`
    }

    await room.say`${target} : ${voteStatus}\n${voteInfo}`
  }

  async function executeKick (
    payload: VotePayload,
    room: Room,
    target: Contact,
  ) {
    const votersMentionText = await mentionTextFromContactIdList(payload.downIdList, room)
    // const announcement =
    await room.say`UNWELCOME GUEST CONFIRMED:\n[Dagger] ${target} [Cleaver]\n\nThank you [Rose] ${votersMentionText} [Rose] for voting for the community, we apprecate it.\n\nThanks everyone in this room for respecting our CODE OF CONDUCT.\n`
    await room.wechaty.sleep(5 * 1000)
    await room.say`Removing ${target} out to this room ...`
    await room.wechaty.sleep(5 * 1000)
    await room.del(target)
    await room.wechaty.sleep(5 * 1000)
    await room.say`Done.`
  }

  return function VoteOutPlugin (wechaty: Wechaty) {
    log.verbose('WechatyPluginContrib', 'VoteOut() VoteOutPlugin(%s)', wechaty)
    wechaty.on('message', async message => {
      const room        = message.room()
      const from        = message.from()

      if (!room)                                { return }
      if (!from)                                { return }
      if (message.type() !== Message.Type.Text) { return }

      if (!isVoteManagedRoom(room))                   { return }

      const mentionList = await message.mentionList()
      if (!mentionList || mentionList.length === 0)   { return }

      for (const mention of mentionList) {
        if (mention.id === message.wechaty.userSelf().id) { return }
        if (isWhitelistContact(mention))                  { return }
      }

      const mentionText = await message.mentionText()

      if (isVoteDown(mentionText)) {
        for (const votee of mentionList) {
          await doVoteDown(room, from, votee)
        }
      } else if (isVoteUp(mentionText)) {
        await doVoteUp(message)
      }
    })
  }

}
