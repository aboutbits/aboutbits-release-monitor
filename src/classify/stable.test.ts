import { describe, expect, test } from 'bun:test'
import { classifyRelease } from '@classify/stable'
import type { Release } from '@classify/types'

function release(overrides: Partial<Release> = {}): Release {
  return {
    tagName: 'v1.0.0',
    name: null,
    body: '',
    isDraft: false,
    isPrerelease: false,
    ...overrides,
  }
}

describe('classifyRelease - draft / prerelease flags', () => {
  test.each([
    {
      overrides: { isDraft: true },
      expectedReason: 'draft',
      label: 'draft flag',
    },
    {
      overrides: { isPrerelease: true },
      expectedReason: 'prerelease_flag',
      label: 'prerelease flag',
    },
    {
      overrides: { isDraft: true, isPrerelease: true },
      expectedReason: 'draft',
      label: 'draft takes precedence over prerelease',
    },
  ])(
    '$label -> not stable (reason: $expectedReason)',
    ({ overrides, expectedReason }) => {
      const result = classifyRelease(release(overrides))
      expect(result.stable).toBe(false)
      expect(result.reason).toBe(expectedReason)
    },
  )
})

describe('classifyRelease - stable tag names', () => {
  test.each([
    { tagName: 'v1.0.0' },
    { tagName: '1.2.3' },
    { tagName: 'v2.0.0-hotfix' },
    { tagName: 'v1.0.0+20240101' }, // semver build metadata
    { tagName: 'v1.0.0+build.1' },
    { tagName: 'release-2024.05.11' },
    { tagName: 'src-v1.0.0' }, // "src" must not match "rc"
    { tagName: 'v1.0.0-security-patch' }, // "security" keyword, not an unstable identifier
    { tagName: 'v3.14.1592' },
  ])('$tagName is stable', ({ tagName }) => {
    const result = classifyRelease(release({ tagName }))
    expect(result.stable).toBe(true)
    expect(result.reason).toBeUndefined()
  })
})

describe('classifyRelease - unstable tag names', () => {
  test.each([
    { tagName: 'v1.0.0-alpha', expectedMatch: 'alpha' },
    { tagName: 'v1.0.0-alpha.1', expectedMatch: 'alpha' },
    { tagName: 'v1.0.0-beta', expectedMatch: 'beta' },
    { tagName: 'v1.0.0-beta.2', expectedMatch: 'beta' },
    { tagName: 'v1.0.0-rc', expectedMatch: 'rc' },
    { tagName: 'v1.0.0-rc1', expectedMatch: 'rc' },
    { tagName: 'v1.0.0-rc.1', expectedMatch: 'rc' },
    { tagName: 'v1.0.0-pre', expectedMatch: 'pre' },
    { tagName: 'v1.0.0-pre1', expectedMatch: 'pre' },
    { tagName: 'v1.0.0-dev', expectedMatch: 'dev' },
    { tagName: 'v1.0.0.dev0', expectedMatch: 'dev' },
    { tagName: 'v1.0.0-nightly', expectedMatch: 'nightly' },
    { tagName: 'v1.0.0-snapshot', expectedMatch: 'snapshot' },
    { tagName: 'v1.0.0-preview', expectedMatch: 'preview' },
    { tagName: 'v1.0.0-canary', expectedMatch: 'canary' },
    { tagName: 'v1.0.0-next', expectedMatch: 'next' },
    { tagName: 'v1.0.0-experimental', expectedMatch: 'experimental' },
    { tagName: 'v1.0.0-insider', expectedMatch: 'insider' },
    { tagName: 'v1.0.0-insiders', expectedMatch: 'insiders' },
    { tagName: 'v1.0.0-unstable', expectedMatch: 'unstable' },
    { tagName: 'v1.0.0-edge', expectedMatch: 'edge' },
    { tagName: 'v1.0.0-eap', expectedMatch: 'eap' },
    { tagName: 'v1.0.0-wip', expectedMatch: 'wip' },
    { tagName: 'v1.0.0_beta_2', expectedMatch: 'beta' }, // underscore separator
    { tagName: 'ALPHA.1', expectedMatch: 'alpha' }, // case-insensitive, at start
    { tagName: 'RC-1.0', expectedMatch: 'rc' }, // at start of string
  ])(
    '$tagName is not stable (matched: $expectedMatch)',
    ({ tagName, expectedMatch }) => {
      const result = classifyRelease(release({ tagName }))
      expect(result.stable).toBe(false)
      expect(result.reason).toBe('tag_name')
      expect(result.matched?.toLowerCase()).toBe(expectedMatch)
    },
  )
})

describe('classifyRelease - false-positive guards', () => {
  test.each([
    { tagName: 'v1.0.0-src', label: '"src" does not trigger "rc"' },
    {
      tagName: '1.0.0+20240501',
      label: 'semver build metadata (+) is stable',
    },
    {
      tagName: 'v1.0-context',
      label: '"next" inside "context" is not flagged',
    },
  ])('$label', ({ tagName }) => {
    expect(classifyRelease(release({ tagName })).stable).toBe(true)
  })
})
