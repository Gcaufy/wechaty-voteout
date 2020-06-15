/* eslint-disable brace-style */
import {
  Room,
  Contact,
  log,
}                from 'wechaty'
import LRUCache  from 'lru-cache'

export interface VotePayload {
  downIdList : string[],
  downNum    : number,
  upIdList   : string[],
  upNum      : number,
}

const DEFAULT_PAYLOAD: Readonly<VotePayload> = {
  downIdList : [],
  downNum    : 0,
  upIdList   : [],
  upNum      : 0,
}

let lruCache: LRUCache<string, VotePayload>

const init = () => {
  const lruOptions: LRUCache.Options<string, VotePayload> = {
    // length: function (n) { return n * 2},
    dispose (key, val) {
      log.silly('WechatyPluginContrib', 'VoteOut() lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
    },
    max: 1000,
    maxAge: 60 * 60 * 1000,
  }
  lruCache = new LRUCache<string, VotePayload>(lruOptions)
}

const buildKey = (room: Room, votee: Contact) => `${room.id}-${votee.id}-vote`

const get = (room: Room, votee: Contact): Readonly<VotePayload> => {
  const key = buildKey(room, votee)
  return lruCache.get(key) || DEFAULT_PAYLOAD
}

const set = (room: Room, votee: Contact, payload: VotePayload) => {
  const key = buildKey(room, votee)
  lruCache.set(key, payload)
}

const del = (room: Room, votee: Contact) => {
  const key = buildKey(room, votee)
  lruCache.del(key)
}

const prune = () => lruCache.prune()

export {
  init,
  get,
  set,
  del,
  prune,
}
