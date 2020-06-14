import { Contact } from 'wechaty'
import { VoteOutConfig } from './vote-out'

export const DEFAULT_VOTE_OUT_CONFIG: Partial<VoteOutConfig> = {
  kick: '经 {{ voters }} 投票，你即将离开此群。',
  repeat: '{{ voter }} You can only vote {{ votee }} once.',
  threshold: 3,
  voteDown: [
    '[弱]',
    '/:MMWeak',
    '<img class="qqemoji qqemoji80" text="[弱]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />',
    '[ThumbsDown]',
  ],
  voteUp: [
    '[强]',
    '/:MMStrong',
    '< img class="qqemoji qqemoji79" text="[强]_web" src="/zh_CN/htmledition/v2/images/spacer.gif”>',
    '[ThumbsUp]',
  ],
  warn: '可能是因为你的聊天内容不当导致被用户投票，当前票数为 {{ count }}，当天累计票数达到 {{ target }} 时，你将被请出此群。',
  whitelist: (_: Contact) => false,
}
