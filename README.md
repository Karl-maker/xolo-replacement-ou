# Edu Service

Edu Service is an open, self-hostable foundation for dynamic learning content. It enables people to create, share, discover, and interact with learning experiences while preserving clear ownership, safe collaboration, and an auditable history of important changes.

> **Status:** early foundation. The current codebase establishes the core, persistence, and command-line layers; the learning-content model and user experience will evolve within those boundaries.

## Product direction

Edu Service is designed for learners, educators, and communities that want learning material to be living rather than static. People should be able to publish content, respond to it, build on it, and learn together without making the system dependent on one interface or platform.

The service will support:

- Dynamic learning content that can be created, revised, organised, and shared.
- Interaction around content, such as responses, feedback, discussion, and collaboration.
- Clear ownership and access rules for private, shared, and public material.
- Traceable changes and moderation-friendly records for meaningful user actions.
- Multiple delivery channels over time, beginning with the CLI and extending to APIs and web clients.

## Principles

| Principle             | What it means                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Learner-centred       | Content and interactions should help people understand, practise, and contribute.              |
| Dynamic by design     | Learning materials can evolve; changes must retain useful history and ownership.               |
| Open collaboration    | Sharing and interaction are first-class capabilities, bounded by explicit permissions.         |
| Privacy and safety    | Collect the minimum data necessary and avoid exposing private learning activity.               |
| Accessible foundation | Interfaces and content models should support varied devices, abilities, and learning contexts. |
| Portable              | Keep core data and business rules independent of a particular client or hosting provider.      |
| Auditable             | Important state changes have structured, append-only audit records.                            |

## Architecture

The architecture keeps learning-domain rules independent of delivery and infrastructure.

```
CLI / future API / future web clients
                │
                ▼
       packages/core
domain rules, use cases, ports, permissions, audit-event definitions
                │
                ▼
        packages/db
Prisma repositories, transactions, PostgreSQL persistence, audit storage
```

| Package         | Responsibility                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core` | Domain concepts, application use cases, ports, permission checks, and audit-event definitions. It must not depend on the CLI, Prisma, PostgreSQL, or a web framework. |
| `packages/db`   | PostgreSQL and Prisma adapters that implement core ports, transactions, migrations, and durable audit storage.                                                        |
| `packages/cli`  | A thin command-line adapter that validates input, invokes the public core API, and renders output. It does not contain learning-domain rules.                         |

This dependency direction is deliberate: adapters may depend on core, but core never depends on adapters. New APIs, jobs, or web clients must call core through its public contracts rather than duplicating domain logic.

## Development

Requirements: Node.js 22 or later and pnpm 12.15.0.

```sh
pnpm install
pnpm verify
```

`pnpm verify` runs the repository's build, type checks, and unit tests. GitHub Actions also runs PostgreSQL integration tests, a CLI smoke test, and the Docker test build on pull requests and pushes to `main`.

For database-backed integration tests locally:

```sh
pnpm db:up:test
pnpm db:migrate:test
pnpm --filter @ou-manager/db test:integration
```

Stop local database containers with `pnpm db:down`.

## Quality standards

Repository-wide engineering rules for Codex and Claude Code live in [AGENTS.md](AGENTS.md). They require contributors to reuse suitable existing utilities, preserve the architecture, test normal and edge cases, and review every change against the GitHub Actions workflow. [CLAUDE.md](CLAUDE.md) imports the same policy for Claude Code.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations and [docs/logging.md](docs/logging.md) for logging and audit-trail guidance.

## Roadmap

1. Establish learning-content, authoring, sharing, and interaction domain models.
2. Deliver content creation, discovery, access control, and interaction workflows through core and the CLI.
3. Add API and web adapters without moving business rules out of core.
4. Add moderation, accessibility, observability, and export capabilities as the collaborative product surface grows.

## License

Licensed under the PolyForm Noncommercial License 1.0.0. See [LICENSE](LICENSE).
