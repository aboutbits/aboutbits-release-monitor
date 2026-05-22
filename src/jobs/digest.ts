import { and, eq, gt, isNull } from 'drizzle-orm'
import { buildDigestBlocks } from '@bot/blocks/digest'
import { sendBlocks } from '@bot/send'
import { db } from '@db/client'
import {
  notifications,
  releases,
  repositories,
  subscriptions,
} from '@db/schema'

type RepoGroup = {
  repo: typeof repositories.$inferSelect
  releases: (typeof releases.$inferSelect)[]
}

export async function runDigestJob(): Promise<void> {
  const allChannels = await db
    .selectDistinct({ channelId: subscriptions.channelId })
    .from(subscriptions)

  await Promise.all(
    allChannels.map(({ channelId }) =>
      sendDigestForChannel(channelId).catch((err: unknown) => {
        console.error(`Digest failed for channel ${channelId}:`, err)
      }),
    ),
  )
}

async function sendDigestForChannel(channelId: string): Promise<void> {
  const pending = await db
    .select({ release: releases, repo: repositories })
    .from(releases)
    .innerJoin(
      subscriptions,
      eq(subscriptions.repositoryId, releases.repositoryId),
    )
    .leftJoin(
      notifications,
      and(
        eq(notifications.releaseId, releases.id),
        eq(notifications.channelId, channelId),
      ),
    )
    .innerJoin(repositories, eq(repositories.id, releases.repositoryId))
    .where(
      and(
        eq(subscriptions.channelId, channelId),
        gt(releases.publishedAt, subscriptions.subscribedAt),
        eq(releases.isSecurity, false),
        isNull(notifications.id),
        eq(subscriptions.notificationMode, 'digest'),
      ),
    )

  if (pending.length === 0) {
    return
  }

  const byRepo = new Map<string, RepoGroup>()

  for (const { release, repo } of pending) {
    const key = `${repo.forge}/${repo.owner}/${repo.repo}`
    let entry = byRepo.get(key)
    if (!entry) {
      entry = { repo, releases: [] }
      byRepo.set(key, entry)
    }
    entry.releases.push(release)
  }

  const blocks = buildDigestBlocks([...byRepo.values()])
  const sent = await sendBlocks(channelId, ':package: Release Digest', blocks)

  if (sent) {
    // Send-then-mark is intentional: at-least-once. If we crash between the
    // Slack call and this insert, the next digest re-delivers - better than
    // at-most-once, which would silently drop a digest.
    const releaseIds = pending.map((p) => p.release.id)
    await db
      .insert(notifications)
      .values(
        releaseIds.map((releaseId) => ({
          releaseId,
          channelId,
          kind: 'digest' as const,
        })),
      )
      .onConflictDoNothing()
  }
}
