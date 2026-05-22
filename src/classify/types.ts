export type Release = {
  tagName: string
  name: string | null
  body: string
  isDraft: boolean
  isPrerelease: boolean
}

export type StableFilterReason = 'draft' | 'prerelease_flag' | 'tag_name'

export type StableFilterResult = {
  stable: boolean
  reason?: StableFilterReason
  matched?: string
}

export type SecurityCheckResult = {
  isSecurity: boolean
  score: number
  confidence: 'high' | 'medium' | 'low' | 'none'
  reasons: string[]
}
