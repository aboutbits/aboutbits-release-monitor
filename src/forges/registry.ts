import { githubForge } from './github'
import type { Forge } from './types'

const registry: Record<string, Forge> = {
  github: githubForge,
}

export function getForge(name: string): Forge {
  const forge = tryGetForge(name)
  if (!forge) {
    throw new Error(
      `Unsupported forge: "${name}". Known forges: ${Object.keys(registry).join(', ')}`,
    )
  }

  return forge
}

export function tryGetForge(name: string): Forge | null {
  return registry[name] ?? null
}

export function listForges(): string[] {
  return Object.keys(registry)
}
