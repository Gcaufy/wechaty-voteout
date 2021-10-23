# Wechaty VoteOut Plugin

[![NPM Version](https://img.shields.io/npm/v/wechaty-voteout?color=brightgreen)](https://www.npmjs.com/package/wechaty-voteout)
[![NPM](https://github.com/Gcaufy/wechaty-voteout/workflows/NPM/badge.svg)](https://github.com/Gcaufy/wechaty-voteout/actions?query=workflow%3ANPM)
[![Wechaty Plugin Contrib](https://img.shields.io/badge/Wechaty%20Plugin-VoteOut-brightgreen.svg)](https://github.com/Gcaufy/wechaty-voteout)
[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/Wechaty/wechaty)

Wechaty VoteOut Plugin can help you to have a vote and kick-out feature for you room.

![ScreenShot](https://user-images.githubusercontent.com/2182004/80809484-5d311400-8bf4-11ea-95c6-39426730067c.png)

## Get Start

### Step 1: Install

```sh
npm install wechaty-voteout --save
```

### Step 2: Make a bot

```sh
$ vim mybot.js

import { Wechaty } from 'wechaty';
import { VoteOut } from 'wechaty-voteout';

const bot = Wechaty.instance();

bot.use(VoteOut({ /* options */ }))
.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
.on('login', user => console.log(`User ${user} logged in`))
.start();
```

### Step 3: Run

```sh
node mybot.js
```

## Options

```ts
const DEFAULT_CONFIG = {
  // Which room(s) you want the bot to work with.
  // Can be a RegExp (for topic) or a function (filter room instance)
  // E.g. room: function (room) { room.topic().indexOf('我的') > -1 }
  room: [/Room Topic 1/i, 'room_id@chatroom'],
  // When the people reach the target, then means (s)he has been voted out.
  threshold: 3,
  // Who never be kicked-out by voting.
  // RegExp for contact name, string for contact id
  whitelist: [],
  // Different puppet get different sign
  // We run more cases to see what sign it is, and update the comment here.
  downEmoji: [
    '[弱]',
    '[ThumbsDown]',
    '<img class="qqemoji qqemoji80" text="[弱]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />',
  ],
  // Warn template, set to falsy to disable the warn message
  warn: [
    '可能是因为你的聊天内容不当导致被用户投票，当前票数为 {{ downNum }}，当天累计票数达到 {{ threshold }} 时，你将被请出此群。',
  ]
  // Kick-out template, set to falsy to disable the message.
  kick: '经 {{ voters }} 几人投票，你即将离开此群。',
  repeat: '你已经投票过 {{ votee }} 了，无需再投。',
}
```

## History

### master v1.0 (Oct 23, 2021)

1. ES Module enabled

### v0.6 (Jun 15, 2020)

1. Enhancing the `VoteOutConfig` for plugin.
1. Refactored the source code to use the helper functions from `wechaty-plugin-contrib`

### v0.2 (Jun 9, 2020)

Converted to TypeScript with DevOps by @huan

### v0.0.3 (May 1, 2020)

First version by @gcaufy

## Maintainers

@huan

## Author

@gcaufy

## Reference

* [Wechaty](https://github.com/wechaty/wechaty)
