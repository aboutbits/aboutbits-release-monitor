import { app } from '@bot/app'
import type { KnownBlock } from '@slack/types'

const MAX_RETRIES = 3

export async function sendBlocks(
  channelId: string,
  text: string,
  blocks: KnownBlock[],
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await app.client.chat.postMessage({
        channel: channelId,
        text,
        blocks,
        unfurl_links: false,
        unfurl_media: false,
      })
      return true
    } catch (err: unknown) {
      const e = err as {
        data?: { error?: string }
        headers?: Record<string, string>
      }
      const code = e.data?.error
      if (code === 'channel_not_found' || code === 'not_in_channel') {
        console.warn(`Cannot send to channel ${channelId}: ${code}`)
        return false
      }

      if (code === 'ratelimited') {
        if (attempt === MAX_RETRIES) {
          console.error(
            `Slack rate limited, giving up after ${MAX_RETRIES} attempts`,
          )
          throw err
        }
        const retryAfter = parseInt(e.headers?.['retry-after'] ?? '60', 10)
        console.warn(
          `Slack rate limited (attempt ${attempt}/${MAX_RETRIES}), retry after ${retryAfter}s`,
        )
        await Bun.sleep(retryAfter * 1000)
        continue
      }

      throw err
    }
  }

  // Unreachable - the loop always returns or throws.
  throw new Error('sendBlocks: exhausted retries')
}
