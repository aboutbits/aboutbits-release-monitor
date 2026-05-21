const BASE = 'https://api.github.com'

const defaultHeaders = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

export async function githubFetch(
  path: string,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...defaultHeaders, ...extraHeaders },
  })

  if (!res.ok && res.status !== 304) {
    throw new Error(`GitHub API error ${res.status} for ${path}`)
  }

  return res
}
