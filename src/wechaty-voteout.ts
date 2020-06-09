/* eslint-disable semi */
/* eslint-disable sort-keys */
import {
  Wechaty,
  Message,
  Room,
  Contact,
} from 'wechaty'

import LRU from 'lru-cache';
import mustache from  'mustache';
import isPromise from 'is-promise';

import { runSequenceWithDelay } from './sequence';

const DEFAULT_CONFIG = {
  // When the people reach the target, then means (s)he has been voted out.
  target: 3,
  // Warn template, set to falsy to disable the warn message
  warnTemplate: '可能是因为你的聊天内容不当导致被用户投票，当前票数为 {{ count }}，当天累计票数达到 {{ target }} 时，你将被请出此群。',
  // Kickout template, set to falsy to disable the message.
  kickoutTemplate: '经 {{ voters }} 几人投票，你即将离开此群。',
  // Different puppet get different sign
  // We run more cases to see what sign it is, and update the comment here.
  sign: [
    '[弱]',
    '[ThumbsDown]',
    '/:MMWeak',
    '<img class="qqemoji qqemoji80" text="[弱]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />',
  ],

  // The function to check if some one is voted.
  // Default function is to check is there a sign in the text.
  isVoted: null,
  // Which room(s) you want the bot to work with.
  // Can be a room topic array or a function
  // E.g. ['Room1', 'Room2']
  // E.g. room: function (room) { room.topic().indexOf('我的') > -1 }
  // Set to falsy value means works for all rooms.
  // Which room(s) you want the bot to work with.
  room: false,
  // Who never be kickedout by voting
  whiteList: [],
  // Vote expred time, default to 1 day.
  expired: 24 * 3600 * 1000, // 1 day
}

interface VoteOutConfig {
  target          : number;
  warnTemplate    : string;
  kickoutTemplate : string;
  sign            : string[];
  // mentionList, text, m, config
  isVoted?        : null | ((mentionList: Contact[], text: string, message: Message, config: Partial<VoteOutConfig>) => Promise<boolean>);
  room            : boolean | string[] | ((room: Room) => Promise<boolean>);
  whiteList?      : string[];
  expired         : number;
}

function VoteOut (config: Partial<VoteOutConfig> = {}) {

  config = Object.assign({}, DEFAULT_CONFIG, config);

  if (typeof config.room === 'string') {
    config.room = [ config.room ];
  }
  if (typeof config.sign === 'string') {
    config.sign = [ config.sign ];
  }

  const cache = new LRU({
    maxAge: config.expired,
    max: 1000, // hard code the max length of cache, 1000 is enough for the vote out case
  });

  // Prune the expired cache. other wise it can only be removed from get
  setInterval(() => {
    cache.prune()
  }, config.expired);

  return function VoteOutPlugin (bot: Wechaty) {
    bot.on('message', function (m: Message) {
      return (async function () {
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
        if (typeof config.room === 'function') {
          let roomCheckRst = false;
          try {
            roomCheckRst = await config.room(room);
          } catch (e) {};
          if (isPromise<boolean, boolean>(roomCheckRst)) {
            roomCheckRst = await roomCheckRst;
          }
          if (!roomCheckRst) {
            return;
          }
        } else if (config.room && Array.isArray(config.room)) {
          if (!config.room.includes(topic)) {
            return;
          }
        }

        // According to the doc: https://wechaty.github.io/wechaty/#Message+mentionList
        // It only works in few puppet
        let mentionList = await m.mentionList();

        mentionList = mentionList
          .filter(contact => !(config.whiteList?.includes(contact.name()))) // (s)he is not in the white list
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
