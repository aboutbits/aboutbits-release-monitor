import type { Release, Repository } from '@db/schema'
import type { KnownBlock } from '@slack/types'

export function buildReleaseBlocks(
  repo: Repository,
  release: Release,
): KnownBlock[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ':package: New Release',
        emoji: true,
      },
    },
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'link',
              url: release.url,
              text: `${repo.owner}/${repo.repo} ${release.tagName}`,
              style: { bold: true },
            },
          ],
        },
      ],
    },
  ]
}
