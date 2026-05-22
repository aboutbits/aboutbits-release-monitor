import type { Release, SecurityCheckResult } from '@classify/types'

type Signal = {
  pattern: RegExp
  weight: number
  reason: string
  // Weak signals contribute score but cannot trigger isSecurity alone.
  // At least one non-weak signal must match for the release to be flagged.
  requiresCorroboration?: boolean
}

const SECURITY_SIGNALS: Signal[] = [
  // --- Definitive identifiers ---
  {
    pattern: /CVE-\d{4}-\d+/i,
    weight: 10,
    reason: 'Contains CVE identifier',
  },
  {
    pattern: /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i,
    weight: 10,
    reason: 'Contains GHSA ID',
  },
  {
    pattern: /OSV-\d{4}-\d+/i,
    weight: 10,
    reason: 'Contains OSV identifier',
  },

  // Markdown section header - very strong signal, maintainers don't add this casually.
  {
    pattern: /^#+\s*security(\s+(fixes?|updates?|advisor))?/im,
    weight: 9,
    reason: 'Has Security section header',
  },
  {
    pattern: /^#+\s*vulnerabilit/im,
    weight: 9,
    reason: 'Has Vulnerabilities section header',
  },

  // --- Strong phrases ---
  {
    pattern: /security\s+advisory/i,
    weight: 8,
    reason: 'Mentions security advisory',
  },
  {
    pattern: /remote\s+code\s+execution|\bRCE\b/,
    weight: 8,
    reason: 'Mentions RCE',
  },
  {
    pattern: /authentication\s+bypass/i,
    weight: 8,
    reason: 'Mentions authentication bypass',
  },
  {
    pattern: /privilege\s+escalation/i,
    weight: 8,
    reason: 'Mentions privilege escalation',
  },
  {
    pattern: /\b(XSS|CSRF|SSRF|SQLi|LFI|RFI)\b/,
    weight: 8,
    reason: 'Mentions known attack vector',
  },
  { pattern: /zero.?day/i, weight: 8, reason: 'Mentions zero-day' },
  {
    pattern: /sandbox\s+(escape|bypass)/i,
    weight: 8,
    reason: 'Mentions sandbox escape/bypass',
  },
  {
    pattern: /responsibly\s+disclosed/i,
    weight: 7,
    reason: 'Mentions responsible disclosure',
  },
  { pattern: /\bexploit(ed|able)\b/i, weight: 6, reason: 'Mentions exploit' },
  { pattern: /\bCVSS\b/i, weight: 6, reason: 'Mentions CVSS score' },

  // --- Medium phrases ---
  {
    pattern: /security\s+(fix|patch|issue)/i,
    weight: 5,
    reason: 'Mentions security fix/patch',
  },
  {
    pattern: /vulnerabilit(y|ies)/i,
    weight: 5,
    reason: 'Mentions vulnerability',
  },
  {
    pattern: /patch(ed)?\s+(a\s+)?security/i,
    weight: 5,
    reason: 'Mentions patched security issue',
  },
  {
    pattern: /path\s+traversal|directory\s+traversal/i,
    weight: 5,
    reason: 'Mentions path traversal',
  },
  {
    pattern: /command\s+injection/i,
    weight: 5,
    reason: 'Mentions command injection',
  },
  {
    pattern: /prototype\s+pollution/i,
    weight: 5,
    reason: 'Mentions prototype pollution',
  },
  {
    pattern: /(unsafe|insecure)\s+deserialization/i,
    weight: 5,
    reason: 'Mentions unsafe deserialization',
  },
  {
    pattern: /use.after.free/i,
    weight: 5,
    reason: 'Mentions use-after-free',
  },
  {
    pattern: /buffer\s+overflow/i,
    weight: 5,
    reason: 'Mentions buffer overflow',
  },
  {
    pattern: /information\s+disclosure/i,
    weight: 5,
    reason: 'Mentions information disclosure',
  },
  {
    pattern: /improper\s+(validation|authentication|authorization)/i,
    weight: 5,
    reason: 'Mentions improper validation/auth',
  },

  // --- Weak signals (require corroboration) ---
  {
    pattern: /\bsecurity\b/i,
    weight: 2,
    reason: 'Mentions security',
    requiresCorroboration: true,
  },
  {
    pattern: /\bcritical\b/i,
    weight: 2,
    reason: 'Mentions critical',
    requiresCorroboration: true,
  },
  {
    pattern: /\bmalicious\b/i,
    weight: 2,
    reason: 'Mentions malicious',
    requiresCorroboration: true,
  },
  {
    pattern: /\battacker\b/i,
    weight: 2,
    reason: 'Mentions attacker',
    requiresCorroboration: true,
  },
  {
    pattern: /\burgent\b/i,
    weight: 1,
    reason: 'Mentions urgent',
    requiresCorroboration: true,
  },
  {
    pattern: /important\s+update/i,
    weight: 1,
    reason: 'Mentions important update',
    requiresCorroboration: true,
  },
]

const THRESHOLD = 5
const TITLE_MULTIPLIER = 1.5

type ScoreResult = {
  score: number
  reasons: string[]
  hasNonWeakMatch: boolean
}

function scoreText(text: string, multiplier: number): ScoreResult {
  let score = 0
  let hasNonWeakMatch = false
  const reasons: string[] = []

  for (const signal of SECURITY_SIGNALS) {
    if (signal.pattern.test(text)) {
      score += signal.weight * multiplier
      reasons.push(signal.reason)
      if (!signal.requiresCorroboration) {
        hasNonWeakMatch = true
      }
    }
  }

  return { score, reasons, hasNonWeakMatch }
}

function getConfidence(score: number): SecurityCheckResult['confidence'] {
  if (score >= 10) {
    return 'high'
  }
  if (score >= 7) {
    return 'medium'
  }
  if (score >= THRESHOLD) {
    return 'low'
  }
  return 'none'
}

export function checkSecurityRelease(release: Release): SecurityCheckResult {
  // The "title" for scoring purposes is the release name if present,
  // otherwise the tag name. Maintainers put security keywords in either.
  const title = release.name ?? release.tagName

  const titleResult = scoreText(title, TITLE_MULTIPLIER)
  const bodyResult = scoreText(release.body, 1)

  const totalScore = titleResult.score + bodyResult.score
  const hasNonWeakMatch =
    titleResult.hasNonWeakMatch || bodyResult.hasNonWeakMatch

  // Dedupe reasons: same signal in title + body contributes to score twice
  // (genuine corroboration) but shouldn't appear twice in the output.
  const reasons = Array.from(
    new Set([...titleResult.reasons, ...bodyResult.reasons]),
  )

  // Corroboration rule: if only weak signals matched, do not flag as security
  // regardless of accumulated score. "Critical bug fix in critical path" must not trigger.
  const isSecurity = totalScore >= THRESHOLD && hasNonWeakMatch

  return {
    isSecurity,
    score: totalScore,
    confidence: getConfidence(totalScore),
    reasons,
  }
}
