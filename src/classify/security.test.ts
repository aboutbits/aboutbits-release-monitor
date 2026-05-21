import { describe, expect, test } from 'bun:test'
import { checkSecurityRelease } from '@classify/security'
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

describe('checkSecurityRelease — definitive identifiers', () => {
  test.each([
    {
      body: 'Fixes CVE-2024-12345.',
      expectedReason: 'Contains CVE identifier',
    },
    {
      body: 'See GHSA-abcd-1234-efgh for details.',
      expectedReason: 'Contains GHSA ID',
    },
    {
      body: 'Tracked as OSV-2024-98765.',
      expectedReason: 'Contains OSV identifier',
    },
  ])(
    '$expectedReason in body → high confidence',
    ({ body, expectedReason }) => {
      const result = checkSecurityRelease(release({ body }))
      expect(result.isSecurity).toBe(true)
      expect(result.confidence).toBe('high')
      expect(result.reasons).toContain(expectedReason)
    },
  )

  test('CVE in release name applies title multiplier (score ≥ 15)', () => {
    const result = checkSecurityRelease(
      release({ name: 'Security: CVE-2024-99999' }),
    )
    expect(result.isSecurity).toBe(true)
    expect(result.confidence).toBe('high')
    expect(result.score).toBeGreaterThanOrEqual(15)
  })

  test('CVE in tag name (used as title when name is null) is scored', () => {
    const result = checkSecurityRelease(
      release({ tagName: 'CVE-2024-11111', name: null }),
    )
    expect(result.isSecurity).toBe(true)
  })
})

describe('checkSecurityRelease — strong phrase signals', () => {
  test.each([
    {
      body: 'security advisory released',
      expectedReason: 'Mentions security advisory',
    },
    {
      body: 'remote code execution via crafted input',
      expectedReason: 'Mentions RCE',
    },
    {
      body: 'RCE is possible in this version',
      expectedReason: 'Mentions RCE',
    },
    {
      body: 'authentication bypass discovered',
      expectedReason: 'Mentions authentication bypass',
    },
    {
      body: 'privilege escalation vulnerability',
      expectedReason: 'Mentions privilege escalation',
    },
    {
      body: 'XSS attack vector',
      expectedReason: 'Mentions known attack vector',
    },
    {
      body: 'CSRF token missing',
      expectedReason: 'Mentions known attack vector',
    },
    {
      body: 'SSRF through redirect',
      expectedReason: 'Mentions known attack vector',
    },
    { body: 'zero-day exploit', expectedReason: 'Mentions zero-day' },
    { body: 'zeroday issue patched', expectedReason: 'Mentions zero-day' },
    {
      body: 'sandbox escape in v8',
      expectedReason: 'Mentions sandbox escape/bypass',
    },
    {
      body: 'sandbox bypass patched',
      expectedReason: 'Mentions sandbox escape/bypass',
    },
    {
      body: 'responsibly disclosed by researcher',
      expectedReason: 'Mentions responsible disclosure',
    },
    { body: 'exploitable buffer', expectedReason: 'Mentions exploit' },
    { body: 'exploited in the wild', expectedReason: 'Mentions exploit' },
    { body: 'CVSS score 9.8', expectedReason: 'Mentions CVSS score' },
  ])('$expectedReason → isSecurity', ({ body, expectedReason }) => {
    const result = checkSecurityRelease(release({ body }))
    expect(result.isSecurity).toBe(true)
    expect(result.reasons).toContain(expectedReason)
  })
})

describe('checkSecurityRelease — medium phrase signals', () => {
  test.each([
    {
      body: 'security fix included',
      expectedReason: 'Mentions security fix/patch',
    },
    {
      body: 'security patch applied',
      expectedReason: 'Mentions security fix/patch',
    },
    {
      body: 'security issue resolved',
      expectedReason: 'Mentions security fix/patch',
    },
    {
      body: 'a vulnerability was found',
      expectedReason: 'Mentions vulnerability',
    },
    {
      body: 'multiple vulnerabilities fixed',
      expectedReason: 'Mentions vulnerability',
    },
    {
      body: 'patched a security flaw',
      expectedReason: 'Mentions patched security issue',
    },
    {
      body: 'path traversal attack possible',
      expectedReason: 'Mentions path traversal',
    },
    {
      body: 'directory traversal fix',
      expectedReason: 'Mentions path traversal',
    },
    {
      body: 'command injection in parser',
      expectedReason: 'Mentions command injection',
    },
    {
      body: 'prototype pollution via merge',
      expectedReason: 'Mentions prototype pollution',
    },
    {
      body: 'unsafe deserialization of input',
      expectedReason: 'Mentions unsafe deserialization',
    },
    {
      body: 'insecure deserialization',
      expectedReason: 'Mentions unsafe deserialization',
    },
    {
      body: 'use-after-free bug fixed',
      expectedReason: 'Mentions use-after-free',
    },
    {
      body: 'buffer overflow in codec',
      expectedReason: 'Mentions buffer overflow',
    },
    {
      body: 'information disclosure risk',
      expectedReason: 'Mentions information disclosure',
    },
    {
      body: 'improper validation of input',
      expectedReason: 'Mentions improper validation/auth',
    },
    {
      body: 'improper authentication check',
      expectedReason: 'Mentions improper validation/auth',
    },
    {
      body: 'improper authorization logic',
      expectedReason: 'Mentions improper validation/auth',
    },
  ])('$expectedReason → isSecurity', ({ body, expectedReason }) => {
    const result = checkSecurityRelease(release({ body }))
    expect(result.isSecurity).toBe(true)
    expect(result.reasons).toContain(expectedReason)
  })
})

describe('checkSecurityRelease — markdown section headers', () => {
  test.each([
    {
      body: '## Security\nFixed an issue.',
      expectedReason: 'Has Security section header',
    },
    {
      body: '## Security Fixes\n- fixed item',
      expectedReason: 'Has Security section header',
    },
    {
      body: '# Security\nDetails here.',
      expectedReason: 'Has Security section header',
    },
    {
      body: '## Vulnerabilities\nSee below.',
      expectedReason: 'Has Vulnerabilities section header',
    },
  ])('$expectedReason → isSecurity', ({ body, expectedReason }) => {
    const result = checkSecurityRelease(release({ body }))
    expect(result.isSecurity).toBe(true)
    expect(result.reasons).toContain(expectedReason)
  })
})

describe('checkSecurityRelease — corroboration rule (weak signals only)', () => {
  test.each([
    {
      label: 'single weak signal below threshold',
      overrides: { body: 'Improved security.' },
      // weight: 2 < threshold of 5; requiresCorroboration
    },
    {
      label: 'accumulated weak signals above threshold',
      overrides: {
        body: 'This is critical. A malicious attacker could abuse this. Urgent.',
      },
      // "critical" (2) + "malicious" (2) + "attacker" (2) + "urgent" (1) = 7,
      // but all requiresCorroboration → hasNonWeakMatch stays false
    },
    {
      label: 'weak signals split across title and body',
      overrides: {
        name: 'Critical update',
        body: 'Improved security hardening across the board.',
      },
      // "critical" in title (2 × 1.5 = 3) + "security" in body (2) = 5 ≥ threshold,
      // but both requiresCorroboration → hasNonWeakMatch stays false
    },
  ])('$label → not flagged as security', ({ overrides }) => {
    const result = checkSecurityRelease(release(overrides))
    expect(result.isSecurity).toBe(false)
  })
})

describe('checkSecurityRelease — non-security releases', () => {
  test.each([
    { body: '', label: 'empty body' },
    {
      body: 'Added dark mode support. Improved performance of query engine.',
      label: 'pure feature release',
    },
    {
      body: 'Bug fixes and stability improvements.',
      label: 'generic bug fix',
    },
  ])('$label → not security', ({ body }) => {
    const result = checkSecurityRelease(release({ body }))
    expect(result.isSecurity).toBe(false)
  })

  test('empty body has score 0, confidence none, and no reasons', () => {
    const result = checkSecurityRelease(release())
    expect(result.score).toBe(0)
    expect(result.confidence).toBe('none')
    expect(result.reasons).toHaveLength(0)
  })
})

describe('checkSecurityRelease — confidence levels', () => {
  test.each([
    {
      body: 'CVE-2024-00001 patched.',
      expectedConfidence: 'high',
      label: 'score ≥ 10',
    },
    {
      body: 'authentication bypass discovered',
      expectedConfidence: 'medium',
      label: 'score ≥ 7 and < 10',
    },
    {
      body: 'prototype pollution via merge util',
      expectedConfidence: 'low',
      label: 'score ≥ 5 and < 7',
    },
  ] as const)(
    '$label → $expectedConfidence confidence',
    ({ body, expectedConfidence }) => {
      const result = checkSecurityRelease(release({ body }))
      expect(result.confidence).toBe(expectedConfidence)
    },
  )
})

describe('checkSecurityRelease — deduplication of reasons', () => {
  test('same signal in title and body appears only once in reasons', () => {
    const result = checkSecurityRelease(
      release({
        name: 'CVE-2024-1111 fix',
        body: 'This release fixes CVE-2024-1111.',
      }),
    )
    const cveReasons = result.reasons.filter(
      (r) => r === 'Contains CVE identifier',
    )
    expect(cveReasons).toHaveLength(1)
  })

  test('score is additive even when reason is deduped', () => {
    const titleOnly = checkSecurityRelease(release({ name: 'CVE-2024-1111' }))
    const bodyOnly = checkSecurityRelease(release({ body: 'CVE-2024-1111' }))
    const both = checkSecurityRelease(
      release({ name: 'CVE-2024-1111', body: 'CVE-2024-1111' }),
    )
    expect(both.score).toBeGreaterThan(titleOnly.score)
    expect(both.score).toBeGreaterThan(bodyOnly.score)
  })
})
