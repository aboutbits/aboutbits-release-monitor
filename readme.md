# Release Monitor

A Slack bot that monitors repositories for new releases and posts updates to your channels.

- **Periodic digest** - one message per channel per configured interval, grouped by repo
- **Immediate notifications** - get notified right away for every new stable release
- **Instant security alerts** - security releases are posted immediately to all subscribers regardless of their notification mode
- **Per-channel subscriptions** - each channel manages its own list independently

## Commands

| Command | Description |
|---|---|
| `/releases add github owner/repo [mode]` | Subscribe this channel to a repository |
| `/releases remove github owner/repo` | Unsubscribe this channel |
| `/releases modify mode github owner/repo <mode>` | Change the notification mode of an existing subscription |
| `/releases list` | Show all subscriptions in this channel |

### Notification modes

| Mode | Behaviour |
|---|---|
| `digest` | Batched into the periodic digest _(default)_ |
| `immediately` | Posted as soon as a new stable release is discovered |
| `security-only` | Only security releases are posted immediately; others are skipped entirely |

## Installation

See [installation.md](./installation.md) for a full setup guide.

## Development

Dev dependencies are hosted on GitHub Packages. Create an `.npmrc` with a [GitHub PAT](https://github.com/settings/tokens) that has the `read:packages` scope:

```
@aboutbits:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

```bash
bun install
bun run dev          # hot reload
bun test             # run tests
bun run db:generate  # generate migrations after schema changes
bun run db:migrate   # apply migrations manually
```

Migrations are also applied automatically on startup, so `db:migrate` is only needed when running outside of the app (e.g. to inspect the schema before starting).

The database schema is controlled by the `DATABASE_SCHEMA` environment variable (default: `main`). The `public` schema is not supported as a value: this slack app uses Drizzle ORM, and Drizzle's `pgSchema()` rejects public, it expects you to use pgTable() directly for the default schema instead. Avoiding `public` is good practice anyway: it's on every role's default search_path and has historically been a namespace-pollution and privilege-escalation vector, so a dedicated schema keeps the namespace clean and permissions explicit.

`DATABASE_SCHEMA` is a **deploy-time decision**: treat it as fixed for the lifetime of a deployment. The migration files are generated for a specific schema name and committed to the repository. If you change `DATABASE_SCHEMA` after the initial setup, you must regenerate the migrations (`bun run db:generate`) and apply them, otherwise the app will query a schema that does not exist.

## Deployment

The app ships as a Docker image. Migrations run automatically on startup.

```bash
docker run -d \
  --env-file .env \
  --restart unless-stopped \
  ghcr.io/aboutbits/aboutbits-release-monitor:latest
```
