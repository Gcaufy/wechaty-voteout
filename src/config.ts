import { Contact, Room } from 'wechaty'

import {
  matchers,
  talkers,
}                         from 'wechaty-plugin-contrib'

export interface MustacheView {
  threshold: number,
  downEmoji: string,

  downNum?    : number,
  downVoters? : string,

  upEmoji?    : string,
  upNum?      : number,
  upVoters?   : string,
}

const warn: talkers.RoomTalkerOptions = [
  '{{ downEmoji }}-{{ downNum }}{{#upNum}} | +{{ upNum }}{{ upEmoji }}{{/upNum}}',
  '———————————',
  'The one who has been voted {{ downEmoji }} by {{ threshold }} people will be removed from the room as an unwelcome guest.',
  '{{#upVoters}}{{ upEmoji }} By {{ upVoters }}{{/upVoters}}',
  '{{#downVoters}}{{ downEmoji }} By {{ downVoters }}{{/downVoters}}',
].join('\n')

const kick: talkers.RoomTalkerOptions = [
  'UNWELCOME GUEST CONFIRMED:\n[Dagger] {{ votee }} [Cleaver]\n\nThank you [Rose] {{ downVoters }} [Rose] for voting for the community, we appreciate it.\n\nThanks everyone in this room for respecting our CODE OF CONDUCT.\n',
  'Removing {{ votee }} out to this room ...',
  (room: Room, contact: Contact) => room.del(contact).then(_ => 'Done.'),
]

const repeat: talkers.RoomTalkerOptions = [
  'You can only vote {{ votee }} for once.',
]

export interface VoteOutConfig {
  room: matchers.RoomMatcherOptions,

  threshold? : number,
  whitelist? : matchers.ContactMatcherOptions,
  upEmoji?    : string[]
  downEmoji?  : string[],

  warn?   : talkers.RoomTalkerOptions,
  kick?   : talkers.RoomTalkerOptions,
  repeat? : talkers.RoomTalkerOptions,
}

// https://stackoverflow.com/a/51804844/1123955
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export const DEFAULT_CONFIG: Omit<Required<VoteOutConfig>, 'room'> = {
  downEmoji: [
    '[ThumbsUp]',
    '[强]',
    '/:MMStrong',
    '< img class="qqemoji qqemoji79" text="[强]_web" src="/zh_CN/htmledition/v2/images/spacer.gif”>',
  ],
  kick,
  repeat,
  threshold: 3,
  upEmoji: [
    '[ThumbsDown]',
    '[弱]',
    '/:MMWeak',
    '<img class="qqemoji qqemoji80" text="[弱]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />',
  ],
  warn,
  whitelist: (_: Contact) => false,
}
