import type { Release, StableFilterResult } from '@classify/types'

// Tag-name fragments that indicate a non-stable release.
// Note: the primary signal is GitHub's `prerelease: true` flag — this list
// is defense-in-depth for maintainers who don't set the flag.
const UNSTABLE_IDENTIFIERS = [
  'alpha',
  'beta',
  'rc',
  'pre',
  'dev',
  'nightly',
  'snapshot',
  'preview',
  'canary',
  'next',
  'experimental',
  'insider',
  'insiders',
  'unstable',
  'edge',
  'eap',
  'wip',
] as const

// Anchored to require a separator (- . _) or start-of-string before, and
// a digit, separator, or end-of-string after. This avoids false positives
// like "src" matching "rc". Known limitation: tags without a separator
// before the identifier (e.g. "v1.0.0alpha1") will not match — we rely on
// GitHub's `prerelease: true` flag to catch those. Semver build metadata
// ("1.2.3+20240101") is correctly treated as stable.
const UNSTABLE_PATTERN = new RegExp(
  `(?:^|[-._])(${UNSTABLE_IDENTIFIERS.join('|')})(?:$|[\\d._-])`,
  'i',
)

export function classifyRelease(release: Release): StableFilterResult {
  if (release.isDraft) {
    return { stable: false, reason: 'draft', matched: 'draft flag' }
  }

  if (release.isPrerelease) {
    return {
      stable: false,
      reason: 'prerelease_flag',
      matched: 'prerelease flag',
    }
  }

  const match = UNSTABLE_PATTERN.exec(release.tagName)
  if (match !== null) {
    return { stable: false, reason: 'tag_name', matched: match[1] }
  }

  return { stable: true }
}
