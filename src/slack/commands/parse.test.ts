import { describe, expect, test } from 'bun:test'
import { parseArgs, parseRepo } from './parse'

describe('parseArgs', () => {
  test('splits whitespace-separated tokens', () => {
    const result = parseArgs('add github owner/repo immediately')
    expect(result.positional).toEqual([
      'add',
      'github',
      'owner/repo',
      'immediately',
    ])
  })

  test('returns empty positional for empty string', () => {
    const result = parseArgs('')
    expect(result.positional).toEqual([])
  })

  test('handles extra whitespace', () => {
    const result = parseArgs('  list  ')
    expect(result.positional).toEqual(['list'])
  })
})

describe('parseRepo', () => {
  test('parses valid owner/repo', () => {
    expect(parseRepo('torvalds/linux')).toEqual({
      owner: 'torvalds',
      name: 'linux',
    })
  })

  test('parses repos with dots and dashes', () => {
    expect(parseRepo('my-org/my.repo-name')).toEqual({
      owner: 'my-org',
      name: 'my.repo-name',
    })
  })

  test('returns null for missing slash', () => {
    expect(parseRepo('noslash')).toBeNull()
  })

  test('returns null for invalid characters', () => {
    expect(parseRepo('owner/repo with spaces')).toBeNull()
  })

  test('returns null for empty string', () => {
    expect(parseRepo('')).toBeNull()
  })
})
