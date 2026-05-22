import type { NotificationMode } from '@db/schema'
import type { KnownBlock } from '@slack/types'

const MODE_DESCRIPTIONS: Record<NotificationMode, string> = {
  digest: 'periodic digest',
  immediately: 'all releases immediately',
  'security-only': 'security alerts only',
}

const subscribedDateFmt = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

type SubscriptionRow = {
  forge: string
  owner: string
  repo: string
  subscribedAt: Date
  subscribedBy: string
  notificationMode: string
}

export function buildListBlocks(rows: SubscriptionRow[]): KnownBlock[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Subscriptions in this channel' },
    },
    ...rows.flatMap((r): KnownBlock[] => {
      const mode = r.notificationMode as NotificationMode

      return [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${r.forge} ${r.owner}/${r.repo}*`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Added by <@${r.subscribedBy}> on ${subscribedDateFmt.format(r.subscribedAt)}  |  ${MODE_DESCRIPTIONS[mode]}`,
            },
          ],
        },
      ]
    }),
  ]
}
