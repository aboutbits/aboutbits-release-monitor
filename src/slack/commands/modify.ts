import { and, eq } from 'drizzle-orm'
import { db } from '@db/client'
import { type NotificationMode, repositories, subscriptions } from '@db/schema'
import { listForges, tryGetForge } from '@forges/registry'
import { type ParsedArgs, parseRepo } from './parse'
import type { CommandContext } from './index'

const VALID_MODES: readonly NotificationMode[] = [
  'digest',
  'immediately',
  'security-only',
]

function isMode(v: string): v is NotificationMode {
  return (VALID_MODES as readonly string[]).includes(v)
}

export async function handleModify(
  args: ParsedArgs,
  ctx: CommandContext,
): Promise<void> {
  const [property, forgeName, repoArg, modeArg] = args.positional

  if (property !== 'mode' || !forgeName || !repoArg || !modeArg) {
    await ctx.respond(
      `Usage: \`/releases modify mode <${listForges().join('|')}> owner/repo <${VALID_MODES.join('|')}>\``,
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

  if (!isMode(modeArg)) {
    await ctx.respond(
      `Unknown mode \`${modeArg}\`. Valid modes: ${VALID_MODES.map((m) => `\`${m}\``).join(', ')}.`,
    )
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

  const updated = await db
    .update(subscriptions)
    .set({ notificationMode: modeArg })
    .where(
      and(
        eq(subscriptions.channelId, ctx.channelId),
        eq(subscriptions.repositoryId, repo.id),
      ),
    )
    .returning()

  if (updated.length === 0) {
    await ctx.respond(
      `This channel is not subscribed to \`${forgeName} ${parsed.owner}/${parsed.name}\`.`,
    )
    return
  }

  await ctx.respond({
    response_type: 'in_channel',
    text: `<@${ctx.userId}> changed notification mode for \`${forgeName} ${parsed.owner}/${parsed.name}\` to \`${modeArg}\`.`,
  })
}
