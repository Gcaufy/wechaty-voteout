# Wechaty Voteout Plugin

[![Wechaty Plugin Contrib](https://img.shields.io/badge/Wechaty%20Plugin-VoteOut-brightgreen.svg)](https://github.com/Gcaufy/wechaty-voteout)
[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/Wechaty/wechaty)

Wechaty Voteout Plugin can help you to have a vote and kickout feature for you room.

![ScreenShot](https://user-images.githubusercontent.com/2182004/80809484-5d311400-8bf4-11ea-95c6-39426730067c.png)

## Get Start

### Step 1: Install

```sh
npm install wechaty-voteout --save
```

### Step 2: Make a bot

```sh
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

```sh
node mybot.js
```

## Options

```ts
const DEFAULT_CONFIG = {
  // When the people reach the target, then means (s)he has been voted out.
  target: 3,
  // Warn template, set to falsy to disable the warn message
  warnTemplate: '可能是因为你的聊天内容不当导致被用户投票，当前票数为 {{ count }}，当天累计票数达到 {{ target }} 时，你将被请出此群。',
  // Kickout template, set to falsy to disable the message.
  kickoutTemplate: '经 {{ voters }} 几人投票，你即将离开此群。',
  // Different puppet get different sign
  // We run more cases to see what sign it is, and update the comment here.
  sign: ['[弱]', '[ThumbsDown]', '<img class="qqemoji qqemoji80" text="[弱]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'],

  // The function to check if some one is voted.
  // Default function is to check is there a sign in the text.
  isVoted: null,
  // Which room(s) you want the bot to work with.
  // Can be a room topic array or a function
  // E.g. ['Room1', 'Room2']
  // E.g. room: function (room) { room.topic().indexOf('我的') > -1 }
  // Set to falsy value means works for all rooms.
  room: false,
  // Who never be kickedout by voting
  whiteList: [],
  // Vote expred time, default to 1 day.
  expired: 24 * 3600 * 1000, // 1 day
}
```

## Maintainers

@huan

## Author

@gcaufy

## Reference

* [Wechaty](https://github.com/Chatie/wechaty)
