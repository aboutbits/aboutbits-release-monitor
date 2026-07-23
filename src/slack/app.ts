import { App } from '@slack/bolt'
import { requiredString } from '@utils/env.ts'

export const app = new App({
  token: requiredString('SLACK_BOT_TOKEN'),
  appToken: requiredString('SLACK_APP_TOKEN'),
  socketMode: true,
})
