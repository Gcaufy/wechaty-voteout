# Wechaty Voteout Plugin


Wechaty Voteout Plugin can help you to have a vote and kickout feature for you room.


## Get Start


### Step 1: Install

```
$ npm install wechaty-voteout --save
```

### Step 2: Make a bot

```
$ vim mybot.js

const { Wechaty } = require('wechaty');
const WechatyVoteoutPlugin = require('wechaty-voteout');
const bot = Wechaty.instance();

bot.use(WechatyVoteoutPlugin({ /* options */ }))
.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
.on('login', user => console.log(`User ${user} logined`))
.init();
```

### Step 3: Run

```
$ node mybot.js
```

## Options

```
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
```

## Reference

* [Wechaty](https://github.com/Chatie/wechaty)
