import { app } from '@bot/app'
import { buildUsageBlocks } from '@bot/blocks/usage'
import { handleAdd } from './add'
import { handleList } from './list'
import { handleModify } from './modify'
import { type ParsedArgs, parseArgs } from './parse'
import { handleRemove } from './remove'
import type { RespondFn } from '@slack/bolt'

export type CommandContext = {
  channelId: string
  userId: string
  respond: RespondFn
}

type CommandHandler = (args: ParsedArgs, ctx: CommandContext) => Promise<void>

const handlers: Record<string, CommandHandler> = {
  add: handleAdd,
  remove: handleRemove,
  list: handleList,
  modify: handleModify,
}

app.command('/releases', async ({ command, ack, respond }) => {
  await ack()

  const { positional } = parseArgs(command.text)
  const [subcommand, ...rest] = positional
  const ctx: CommandContext = {
    channelId: command.channel_id,
    userId: command.user_id,
    respond,
  }

  const handler = subcommand ? handlers[subcommand] : undefined
  if (!handler) {
    const preamble = subcommand
      ? `Unknown subcommand \`${subcommand}\`.`
      : undefined

    await respond({
      text: 'Releases — usage',
      blocks: buildUsageBlocks(preamble),
    })
    return
  }

  await handler({ positional: rest }, ctx)
})
