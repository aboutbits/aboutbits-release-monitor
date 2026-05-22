import { eq } from 'drizzle-orm'
import { buildReleaseBlocks } from '@bot/blocks/release'
import { buildSecurityBlocks } from '@bot/blocks/security'
import { sendBlocks } from '@bot/send'
import { checkSecurityRelease } from '@classify/security'
import { db } from '@db/client'
import {
  type Release,
  type Repository,
  type Subscription,
  notifications,
  releases,
  repositories,
  subscriptions,
} from '@db/schema'
import { getForge } from '@forges/registry'

const CHUNK_SIZE = 5

export async function runPollJob(): Promise<void> {
  const allRepos = await db.select().from(repositories)
  console.log(`Poll started for ${allRepos.length} repos`)

  for (let i = 0; i < allRepos.length; i += CHUNK_SIZE) {
    const chunk = allRepos.slice(i, i + CHUNK_SIZE)
    await Promise.all(
      chunk.map((repo) =>
        pollOne(repo).catch((err: unknown) => {
          console.error(
            `Poll failed for ${repo.forge}/${repo.owner}/${repo.repo}:`,
            err,
          )
        }),
      ),
    )
  }
}

async function pollOne(repo: Repository): Promise<void> {
  const label = `${repo.forge}/${repo.owner}/${repo.repo}`
  const forge = getForge(repo.forge)

  // --- fetch ---
  const {
    releases: newReleases,
    pollToken,
    notModified,
    maxKnownId,
  } = await forge.pollReleases(repo.owner, repo.repo, {
    lastKnownId: repo.lastKnownReleaseId ?? undefined,
    pollToken: repo.pollToken ?? undefined,
  })

  if (notModified) {
    console.log(`[${label}] Not modified (pollToken hit)`)
    return
  }

  console.log(`[${label}] Found ${newReleases.length} new stable release(s)`)

  // --- persist, classify & notify ---
  const repoSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.repositoryId, repo.id))

  for (const forgeRelease of newReleases) {
    const { isSecurity, score, reasons } = checkSecurityRelease({
      tagName: forgeRelease.tagName,
      name: forgeRelease.name,
      body: forgeRelease.body,
      isDraft: forgeRelease.isDraft,
      isPrerelease: forgeRelease.isPrerelease,
    })

    const [inserted] = await db
      .insert(releases)
      .values({
        repositoryId: repo.id,
        forgeReleaseId: forgeRelease.id,
        tagName: forgeRelease.tagName,
        name: forgeRelease.name,
        url: forgeRelease.url,
        publishedAt: new Date(forgeRelease.publishedAt),
        isSecurity,
        securityScore: score,
        securityReasons: reasons,
      })
      .onConflictDoNothing()
      .returning()

    if (!inserted) {
      console.log(`[${label}] ${forgeRelease.tagName} already in DB, skipping`)
      continue
    }

    if (isSecurity) {
      // Security releases bypass notificationMode and go to every subscriber
      // immediately, including digest-mode ones. The digest job filters them
      // back out (isSecurity = false), so digest subscribers get the security
      // ping now and no duplicate in tomorrow's digest.
      await sendToChannels(
        repo,
        inserted,
        repoSubscriptions,
        'security',
        reasons,
      )
    } else {
      const immediate = repoSubscriptions.filter(
        (s) => s.notificationMode === 'immediately',
      )
      if (immediate.length > 0) {
        await sendToChannels(repo, inserted, immediate, 'immediate')
      }
    }
  }

  // --- update state ---
  await db
    .update(repositories)
    .set({
      lastCheckedAt: new Date(),
      pollToken: pollToken ?? repo.pollToken,
      lastKnownReleaseId: maxKnownId,
    })
    .where(eq(repositories.id, repo.id))
}

async function sendToChannels(
  repo: Repository,
  release: Release,
  targets: Subscription[],
  kind: 'security' | 'immediate',
  reasons: string[] = [],
): Promise<void> {
  const label = `${repo.forge}/${repo.owner}/${repo.repo}`
  const isSecurity = kind === 'security'

  console.log(
    `[${label}] Sending ${kind} notification for ${release.tagName} to ${targets.length} channel(s)`,
  )

  const blocks = isSecurity
    ? buildSecurityBlocks(repo, release, reasons)
    : buildReleaseBlocks(repo, release)
  const text = isSecurity
    ? `:lock: Security release: ${repo.owner}/${repo.repo} ${release.tagName}`
    : `:package: New release: ${repo.owner}/${repo.repo} ${release.tagName}`

  await Promise.all(
    targets.map(async (sub) => {
      const sent = await sendBlocks(sub.channelId, text, blocks)
      if (sent) {
        await db
          .insert(notifications)
          .values({
            releaseId: release.id,
            channelId: sub.channelId,
            kind,
          })
          .onConflictDoNothing()
      } else {
        console.warn(
          `[${label}] Failed to send ${kind} notification to channel ${sub.channelId}`,
        )
      }
    }),
  )
}
