import { and, eq } from 'drizzle-orm'
import { db } from '@db/client'
import { repositories, subscriptions } from '@db/schema'
import { listForges, tryGetForge } from '@forges/registry'
import { type ParsedArgs, parseRepo } from './parse'
import type { CommandContext } from './index'

export async function handleRemove(
  args: ParsedArgs,
  ctx: CommandContext,
): Promise<void> {
  const [forgeName, repoArg] = args.positional

  if (!forgeName || !repoArg) {
    await ctx.respond(
      `Usage: \`/releases remove <${listForges().join('|')}> owner/repo\``,
    )
    return
  }

  if (!tryGetForge(forgeName)) {
    await ctx.respond(
      `Unknown forge \`${forgeName}\`. Supported: ${listForges()
        .map((f) => `\`${f}\``)
        .join(', ')}.`,
    )
    return
  }

  const parsed = parseRepo(repoArg)
  if (!parsed) {
    await ctx.respond('Invalid repo format. Use `owner/repo`.')
    return
  }

  const [repo] = await db
    .select()
    .from(repositories)
    .where(
      and(
        eq(repositories.forge, forgeName),
        eq(repositories.owner, parsed.owner),
        eq(repositories.repo, parsed.name),
      ),
    )
    .limit(1)

  if (!repo) {
    await ctx.respond(
      `\`${forgeName} ${parsed.owner}/${parsed.name}\` is not tracked.`,
    )
    return
  }

  const deleted = await db
    .delete(subscriptions)
    .where(
      and(
        eq(subscriptions.channelId, ctx.channelId),
        eq(subscriptions.repositoryId, repo.id),
      ),
    )
    .returning()

  if (deleted.length === 0) {
    await ctx.respond(
      `This channel is not subscribed to \`${forgeName} ${parsed.owner}/${parsed.name}\`.`,
    )
    return
  }

  await ctx.respond({
    response_type: 'in_channel',
    text: `<@${ctx.userId}> unsubscribed from \`${forgeName} ${parsed.owner}/${parsed.name}\`.`,
  })
}
