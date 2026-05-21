export type ParsedArgs = {
  positional: string[]
}

export function parseArgs(text: string): ParsedArgs {
  const positional = text.trim().split(/\s+/).filter(Boolean)
  return { positional }
}

const REPO_RE = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/

export function parseRepo(arg: string): { owner: string; name: string } | null {
  if (!REPO_RE.test(arg)) {
    return null
  }
  const idx = arg.indexOf('/')
  return { owner: arg.slice(0, idx), name: arg.slice(idx + 1) }
}
