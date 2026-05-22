import { listForges } from '@forges/registry'
import type { KnownBlock } from '@slack/types'

type Command = {
  title: string
  description: string
  usage: (forges: string, modes: string) => string
}

const COMMANDS: Command[] = [
  {
    title: 'Add',
    description: 'Subscribe this channel to releases from a repository.',
    usage: (forges, modes) => `/releases add <${forges}> owner/repo [${modes}]`,
  },
  {
    title: 'Remove',
    description: 'Unsubscribe this channel from a repository.',
    usage: (forges) => `/releases remove <${forges}> owner/repo`,
  },
  {
    title: 'List',
    description: 'List all repositories this channel is subscribed to.',
    usage: () => `/releases list`,
  },
  {
    title: 'Modify',
    description: 'Change the notification mode for an existing subscription.',
    usage: (forges, modes) =>
      `/releases modify mode <${forges}> owner/repo <${modes}>`,
  },
]

export function buildUsageBlocks(preamble?: string): KnownBlock[] {
  const forges = listForges().join('|')
  const modes = 'digest|immediately|security-only'

  const blocks: KnownBlock[] = []

  if (preamble) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `:warning: ${preamble}` }],
    })
  }

  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: '/releases commands', emoji: true },
  })

  for (const cmd of COMMANDS) {
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${cmd.title}*\n${cmd.description}\n\`${cmd.usage(forges, modes)}\``,
      },
    })
  }

  return blocks
}
