/* eslint-disable semi */
/* eslint-disable sort-keys */
import {
  Wechaty,
  Message,
  Room,
  Contact,
  log,
}           from 'wechaty'

import LRU from 'lru-cache';
import mustache from  'mustache';

import { runSequenceWithDelay } from './sequence';

type RoomFunction = (room: Room) => boolean | Promise<boolean>
type RoomOption = string | RegExp | RoomFunction
export type RoomOptions = RoomOption | RoomOption[]

export interface VoteOutConfig {
  // When the people reach the target, then means (s)he has been voted out.
  target: number;
  // Warn template, set to falsy to disable the warn message
  warnTemplate: string;
  // Kickout template, set to falsy to disable the message.
  kickoutTemplate: string;
  // Different puppet get different sign
  // We run more cases to see what sign it is, and update the comment here.
  sign: string[];
  // The function to check if some one is voted.
  // Default function is to check is there a sign in the text.
  isVoted?: null | ((mentionList: Contact[], text: string, message: Message, config: Partial<VoteOutConfig>) => Promise<boolean>);
  // Which room(s) you want the bot to work with.
  // Can be a room topic array or a function
  // E.g. ['Room1', 'Room2']
  // E.g. room: function (room) { room.topic().indexOf('我的') > -1 }
  // Set to falsy value means works for all rooms.
  // Which room(s) you want the bot to work with.
  room: RoomOptions;
  // Who never be kickedout by voting
  whiteList?: string[];
  // Vote expred time, default to 1 day.
  expired: number;
}

const DEFAULT_CONFIG: Partial<VoteOutConfig> = {
  target: 3,
  warnTemplate: '可能是因为你的聊天内容不当导致被用户投票，当前票数为 {{ count }}，当天累计票数达到 {{ target }} 时，你将被请出此群。',
  kickoutTemplate: '经 {{ voters }} 几人投票，你即将离开此群。',
  sign: [
    '[弱]',
    '[ThumbsDown]',
    '/:MMWeak',
    '<img class="qqemoji qqemoji80" text="[弱]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />',
  ],

  isVoted: null,
  whiteList: [],
  expired: 24 * 3600 * 1000, // 1 day
}

export function matchRoomConfig (config: VoteOutConfig) {
  log.verbose('VoteOut', 'matchRoomConfig(%s)', JSON.stringify(config))

  const configRoom = config.room

  return async function matchRoom (room: Room): Promise<boolean> {
    log.verbose('VoteOut', 'matchRoomConfig() matchRoom(%s)', room)

    if (Array.isArray(configRoom)) {
      for (const room of configRoom) {
        if (await matchRoomSingle(room)) {
          return true
        }
      }
      return false
    }

    return matchRoomSingle(configRoom)

    async function matchRoomSingle (option: RoomOption): Promise<boolean> {
      log.verbose('VoteOut', 'matchRoomConfig() matchRoom() matchRoomSingle(%s)', JSON.stringify(option))

      if (typeof option === 'string') {
        return option === room.id
      } else if (option instanceof Function) {
        return option(room)
      } else if (option instanceof RegExp) {
        return option.test(await room.topic())
      } else {
        throw new Error('unknown option: ' + option)
      }
    }

  }
}

function VoteOut (config: Partial<VoteOutConfig> = {}) {

  config = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const isMatchRoom = matchRoomConfig(config as VoteOutConfig)

  const cache = new LRU({
    maxAge: config.expired,
    max: 1000, // hard code the max length of cache, 1000 is enough for the vote out case
  });

  let lastPrune = 0

  return function VoteOutPlugin (bot: Wechaty) {
    bot.on('heartbeat', () => {
      if (Date.now() - lastPrune > config.expired!) {
        // Prune the expired cache. other wise it can only be removed from get
        cache.prune()
        lastPrune = Date.now()
      }
    })
    bot.on('message', function (m: Message) {
      (async function () {
        if (m.type() !== bot.Message.Type.Text) {
          return; // Only deal with the text type message
        }

        const room = m.room();

        // It's not in a room
        if (!room) {
          return;
        }
        const topic = await room.topic();

        // Check if I can work in this group
        if (!await isMatchRoom(room)) {
          return
        }

        // According to the doc: https://wechaty.github.io/wechaty/#Message+mentionList
        // It only works in few puppet
        let mentionList = await m.mentionList();

        mentionList = mentionList
          .filter(contact => !(config.whiteList?.includes(contact.name()))) // (s)he is not in the white list
          .filter(contact => !(config.whiteList?.includes(contact.id))) // (s)he is not in the white list
          .filter(contact => !contact.self()) // (s)he is not the bot himself
          // TODO: I'm not sure can I check the room owner like this.
          .filter(contact => contact.id !== room.owner()?.id); // (s)he is not the room owner.

        // on one is mentioned
        if (mentionList.length === 0) {
          return;
        }

        // Check if is been voted
        const text = m.text();
        let isVoted = false;
        if (typeof config.isVoted === 'function') {
          try {
            isVoted = await config.isVoted(mentionList, text, m, config);
          } catch (e) {}
          // if (isPromise(isVoted)) {
          //   isVoted = await isVoted;
          // }
        } else {
          isVoted = !!(config.sign?.find(sign => {
            return text.indexOf(sign) > -1;
          }));
        }
        if (!isVoted) {
          return;
        }

        let votedOutList = [] as any[];
        let warnList = [] as any [];

        const voteBy = m.from()!;

        mentionList.forEach((contact) => {
          const cacheKey = room.id + ':' + contact.id;
          const voted = cache.get(cacheKey) as any || { count: 0, voters: [] };

          const isdup = voted.voters.find((voter: any) => voter.id === voteBy.id);
          if (voted.count >= config.target! || !isdup) {
            voted.count++;
            if (!isdup) {
              voted.voters.push(voteBy);
              cache.set(cacheKey, voted);
            }
            // When reach the target. then kick out.
            if (voted.count >= config.target!) {
              votedOutList.push({
                contact,
                voters: voted.voters,
                // Only delete the cache when the use was kickedout from the room, so that peopel can vote again
                cb () {
                  cache.del(cacheKey);
                },
              });
            } else {
              if (config.warnTemplate) {
                warnList.push({
                  contact,
                  voted,
                });
              }
            }
          }
        });

        let actions = [] as any[];
        if (warnList.length) {
          actions = actions.concat(warnList.map(item => {
            return function () {
              return room.say(mustache.render(config.warnTemplate!, {
                name: item.contact.name(),
                voter: voteBy.name(),
                room: topic,
                voted: item.voted,
                count: item.voted.count,
                target: config.target,
              }), item.contact)
                .catch(_ => { /* ignore the errors, so that continue to the next. */ });
            }
          }));
        }

        if (votedOutList.length) {
          actions = actions.concat(votedOutList.map(item => {
            return function () {
              if (config.kickoutTemplate) {
                return room.say(mustache.render(config.kickoutTemplate, {
                  name: item.contact.name(),
                  voters: item.voters.map((voter: any) => voter.name()).join(','),
                }), item.contact).catch(_ => {
                  // ignore say error
                }).then(() => {
                  return room.del(item.contact)
                }).then(() => item.cb())
                  .catch(_ => { /* ignore errors, and continue */ });
              }
              return room.del(item.contact).then(() => item.cb())
                .catch(_ => { /* ignore errors, and continue */ });
            }
          }));
        }
        if (actions.length) {
          if (actions.length === 1) {
            await actions[0]();
          } else {
            await runSequenceWithDelay(actions, 500);
          }
        }
      })().catch(e => {
        bot.emit('error', e);
      })
    });
  }
}

export { VoteOut }
