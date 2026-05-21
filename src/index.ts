import { migrate } from 'drizzle-orm/bun-sql/migrator'
import { app } from '@bot/app'
import '@bot/commands/index'
import { db } from '@db/client'
import { runDigestJob } from '@jobs/digest'
import { runPollJob } from '@jobs/poll'

await migrate(db, {
  migrationsFolder: './drizzle',
  migrationsSchema: 'public',
})
console.log('Migrations applied')

const POLL_CRON = process.env.POLL_CRON ?? '0 * * * *' // every hour
const DIGEST_CRON = process.env.DIGEST_CRON ?? '30 7 * * *' // 07:30 UTC = 09:30 Europe/Rome (CEST); shifts to 08:30 in winter (CET)

const pollCron = Bun.cron(POLL_CRON, async () => {
  console.log('Running poll job...')
  await runPollJob().catch((err: unknown) => {
    console.error('Poll job error:', err)
  })
})

const digestCron = Bun.cron(DIGEST_CRON, async () => {
  console.log('Running digest job...')
  await runDigestJob().catch((err: unknown) => {
    console.error('Digest job error:', err)
  })
})

await app.start()
console.log('Bolt app started (socket mode)')

pollCron.ref()
digestCron.ref()
console.log(`Poll cron: ${POLL_CRON} - Digest cron: ${DIGEST_CRON}`)

process.on('SIGTERM', () => {
  void shutdown()
})
process.on('SIGINT', () => {
  void shutdown()
})

async function shutdown() {
  console.log('Shutting down...')
  pollCron.unref()
  digestCron.unref()
  await app.stop()
  process.exit(0)
}
