/** Normalized release shape, independent of any forge's API response format. */
export type ForgeRelease = {
  id: string
  tagName: string
  name: string | null
  url: string
  publishedAt: string
  body: string
  isDraft: boolean
  isPrerelease: boolean
}

export type PollResult = {
  releases: ForgeRelease[]
  /** ETag, timestamp, or other forge-specific cache token for the next poll. */
  pollToken?: string
  notModified: boolean
  /**
   * Highest release ID seen this poll, used for deduplication on the next poll.
   * Echo the input `lastKnownId` when nothing changed; return `null` only when
   * the repo has no releases at all.
   */
  maxKnownId: string | null
}

/** Contract every forge implementation must satisfy. */
export type Forge = {
  readonly name: string

  /** Returns the canonical web URL for the given repository. */
  getRepositoryUrl(owner: string, repo: string): string

  /** Throws if the repo doesn't exist or is inaccessible. */
  verifyRepository(owner: string, repo: string): Promise<void>

  /** Returns the latest stable release, or null if none found. */
  fetchLatestStableRelease(
    owner: string,
    repo: string,
  ): Promise<ForgeRelease | null>

  /** Returns new stable releases since lastKnownId, with an optional updated poll token. */
  pollReleases(
    owner: string,
    repo: string,
    opts: { lastKnownId?: string; pollToken?: string },
  ): Promise<PollResult>
}
