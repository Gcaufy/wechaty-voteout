const LRU = require('lru-cache');
const mustache = require('mustache');

const DEFAULT_CONFIG = {
  // When the people reach the target, then means (s)he has been voted out.
  target: 3,
  // Warn template, set to falsy to disable the warn message
  warn: '你好，可能是因为你的聊天内容不当导致被用户投票，当累计票数达到 {{ target }} 时，你将被请出些群。你的当前票数为 {{ voted }}',
  // Different puppet get different sign
  // We run more cases to see what sign it is, and update the comment here.
  sign: ['弱', '<img class="qqemoji qqemoji80" text="[弱]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'];

  // The function to check if some one is voted.
  // Default function is to check is there a sign in the text.
  isVoted: null,
  // Which room(s) you want the bot to work with.
  // E.g. ['Room1', 'Room2']
  // Set to falsy value means works for all rooms.
  room: false,
  // Vote expred time, default to 1 day.
  expired: 24 * 3600 * 1000, // 1 day
}


module.exports = function WechatyVoteOutPlugin (config = {}) {

  config = Object.assign({}, DEFAULT_CONFIG, config);

  if (typeof config.room === 'string') {
    config.room = [ config.room ];
  }
  if (typeof config.sign === 'string') {
    config.sign = [ config.sign ];
  }

  const cache = LRU({
    maxAge: config.expired,
    max: 1000, // hard code the max length of cache, 1000 is enough for the vote out case
  });

  // Prune the expired cache. other wise it can only be removed from get
  setInterval(() => {
    cache.prune()
  }, config.expred);

  return function (bot) {
    bot.on('message', async function (m) {
      if (m.type() !== bot.Message.Type.Text) {
        return; // Only deal with the text type message
      }

      const room = m.room();
      const topic = await room.topic();

      // Check if I can work in this group
      if (config.room && config.room.length) {
        if (!room.includes(topic)) {
          return;
        }
      }

      // According to the doc: https://wechaty.github.io/wechaty/#Message+mentionList
      // It only works in few puppet
      let mentionList = await message.mentionList();

      mentionList = mentionList.filter(contact => {
        return !config.whiteList.includes(contact.name()) && // (s)he is not in the white list
          !contact.self() && // (s)he is not the bot himself
          // TODO: I'm not sure can I check the room owner like this.
          contact !== room.owner(); // (s)he is not the room owner.
      });

      // on one is mentioned
      if (mentionList.length === 0) {
        return;
      }

      // Check if is been voted
      const text = m.text();
      let isVoted = false;
      if (typeof config.isVoted === 'function') {
        isVoted = config.isVoted(mentionList, text, m, config);
      } else {
        isVoted = config.sign.find(sign => {
          return text.indexOf(sign) > -1;
        });
      }
      if (!isVoted) {
        return;
      }

      let votedOutList = [];
      let warnList = [];

      mentionList.forEach((contact) => {
        const cacheKey = topic + ':' + contact.name();
        const voted = cache.get(cacheKey) || 0;

        // When reach the target. then kick out.
        if (voted >= config.target - 1) {
          votedOutList.push({
            concat,
            // Only delete the cache when the use was kickedout from the room
            cb () { cache.del(cacheKey); }
          });
        } else {
          voted++;
          cache.set(cacheKey, voted);
          if (config.warn) {
            warnList.push({
              contact,
              voted,
            });
          }
        }
      });

      const actions = [];
      if (warnList.length) {
        actions = actions.concat(warnList.map(item => {
          return room.say(Mustache.render(config.warn, {
            name: item.contact.name(),
            voter: m.contact().name(),
            room: room.name(),
            voted: item.voted,
            target: config.target,
          }), item.concat);
        }));
      }

      if (votedOutList.length) {
        actions = actions.concat(votedOutList.map(item => {
          return room.del(item.concat).then(() => item.cb());
        }));
      }
      if (actions.length) {
        await Promise.all(actions);
      }
    });
  }
}
