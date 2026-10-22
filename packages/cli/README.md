# @ou-manager/cli

The command-line interface for the OÜ business manager. This document explains how the package is organised and why. It deliberately avoids implementation detail: the goal is that anyone adding a command, a renderer or an error knows which folder to open and which rules to follow.

**The CLI is a thin, separate package.** It parses input, calls the core through a narrow interface, and presents the result. It contains no accounting, tax or deadline logic.

---

## Contents

1. [Design goals](#1-design-goals)
2. [What the big open-source CLIs do](#2-what-the-big-open-source-clis-do)
3. [Folder structure](#3-folder-structure)
4. [Layers and dependency rules](#4-layers-and-dependency-rules)
5. [Command anatomy](#5-command-anatomy)
6. [Request lifecycle](#6-request-lifecycle)
7. [Output model](#7-output-model)
8. [Error model and exit codes](#8-error-model-and-exit-codes)
9. [Configuration](#9-configuration)
10. [I/O and terminal behaviour](#10-io-and-terminal-behaviour)
11. [Planned command tree](#11-planned-command-tree)
12. [Testing strategy](#12-testing-strategy)
13. [Review checklist](#13-review-checklist)

---

## 1. Design goals

| Goal | Meaning |
|---|---|
| **Separate from core** | The dependency points one way: CLI → core. Core never knows the CLI exists. |
| **Structured output** | Every command returns typed data. The same data renders as human text, JSON, NDJSON or plain lines. |
| **Structured errors** | Every failure has a stable code, a human message, an optional hint and a documented exit code. |
| **Scriptable and agent-friendly** | stdout carries data only. Output is stable, versioned and non-interactive when it needs to be. |
| **Human in the loop** | Anything with legal or financial effect needs explicit approval, in line with the project requirements. |
| **Testable in-process** | The whole CLI is one function that takes its dependencies as arguments. |

---

## 2. What the big open-source CLIs do

This structure borrows from several mature projects. The patterns below are the ones we adopted.

| Project | Pattern | What we took |
|---|---|---|
| **GitHub CLI (`gh`)** | Built on Cobra. Each subcommand lives in its own package at `pkg/cmd/<command>/<subcommand>/`. A `Factory` acts as the dependency container for all commands and holds IOStreams for stdin/stdout/stderr. | One folder per command, injected dependencies, an I/O abstraction so commands never touch the real terminal. |
| **kubectl** and its plugins | Each command is an *Options* struct holding IOStreams, with three ordered steps: **Complete** (fill in what's missing), **Validate** (check it), **Run** (do it). | A fixed command lifecycle. We split "Run" further so a command returns data and a renderer prints it. |
| **Prisma CLI** | The published package is a deliberately thin shell that re-exports the real implementation, and the real engine validates its command grammar at construction time so collisions and reserved-flag violations fail the build, not a user's run. | A tiny entry package, plus a startup check that the command registry is valid (no duplicate names, no reserved flags). |
| **oclif-based CLIs** | A shared base command wraps execution: subclasses return data and the base class renders it per format and sets the exit code. oclif also offers a built-in JSON flag that suppresses logs and prints the returned value. | "Commands return data, a shared layer renders it" and `--json` as a framework-level behaviour, not per-command code. |
| **clig.dev guidelines** | Primary data to stdout, diagnostics to stderr, `--json` for machine output, small documented exit codes, no scary stack traces. | The output and error contracts in sections 7 and 8. |

Our own additions: a versioned output envelope, one translation point for errors, and an approval gate for commands with legal or financial effect.

---

## 3. Folder structure

```
packages/cli/
  src/
    bin.ts              # ONLY file that touches process.* (argv, exitCode, signals)
    main.ts             # main(argv, deps) -> exit code. Fully testable in-process
    context.ts          # Context { io, config, client, env, clock }
    framework/
      define-command.ts # command definition shape
      parse.ts          # argv -> validated input (zod)
    commands/
      projects/list.ts
      projects/get.ts
    output/
      envelope.ts       # JSON envelope types + schemaVersion
      render.ts         # picks renderer: human | json | ndjson | plain
      human.ts          # tables, colors, hints
    errors/
      codes.ts          # ErrorCode -> ExitCode table
      cli-error.ts
      map-error.ts      # unknown/core errors -> CliError (the only translation point)
    io/streams.ts       # stdout/stderr/stdin, isTTY, color, width
    config/resolve.ts   # flags > env > project config > user config > defaults
  test/
```

| Folder / file | Owns | Must never |
|---|---|---|
| `bin.ts` | Wiring real dependencies, calling `main`, setting the process exit code, signal handling | Contain logic |
| `main.ts` | The full request lifecycle, returning an exit code | Read `process.*` or exit the process |
| `context.ts` | The `Context` object passed to every command, and the `CoreClient` interface it exposes | Import commands |
| `framework/` | How a command is defined and how argv becomes validated input | Know about any specific command |
| `commands/` | One file per command: declare input and output, call the client, return data | Print, exit, or format errors |
| `output/` | Envelope shape and every renderer | Decide exit codes |
| `errors/` | Error class, code table, error mapping | Print |
| `io/` | Stream abstraction (TTY, colour, width, interactivity) | Read configuration |
| `config/` | Merging all config sources into one resolved object | Prompt or print |
| `test/` | Tests and fakes (fake streams, fake client) | Ship in the build |

---

## 4. Layers and dependency rules

```
bin.ts
  └─► main.ts
        ├─► framework/ ─► commands/ ─► Context ─► CoreClient (interface)
        ├─► output/                                   │
        └─► errors/                                   ▼
                                              adapter over core package
```

Rules:

1. **Core never imports the CLI.**
2. **Commands see only the `CoreClient` interface**, never core internals. An adapter wired in `bin.ts` implements it. Tests pass a fake.
3. **Only `bin.ts` touches `process`.** Everything else gets what it needs through `Context`.
4. **Only `errors/map-error.ts` translates foreign errors** (validation errors, core errors, network errors) into the CLI's error type.
5. **Only `output/` writes to stdout and stderr**, through the stream abstraction.
6. **Commands are leaves.** They never import each other. Shared behaviour moves into `framework/` or `output/`.

---

## 5. Command anatomy

Every command is one file and declares the same four things. This is the kubectl lifecycle (complete, validate, run) adapted so that printing is separate.

| Part | Purpose |
|---|---|
| **Name and summary** | Position in the command tree and the one-line help text |
| **Input schema** | Flags, positional arguments and environment fallbacks, validated before anything runs |
| **Run** | Calls the core client and **returns typed data**. Never prints, never exits |
| **Output schema + human view** | The JSON contract for the returned data, and how to present it to a person |

Additional metadata a command can declare:

- **Effect level**: `read`, `prepare` (creates a draft or proposal), or `commit` (files, posts, pays, signs). `commit` commands go through the approval gate (section 8).
- **Streamable**: whether list output may be emitted as NDJSON.

The registry validates all definitions at startup: unique names, no reserved flag names, every command has both schemas.

---

## 6. Request lifecycle

```
argv
  │
  ▼
 parse        argv → validated input        (failure: usage error)
  │
  ▼
 gate         effect = commit? require approval   (failure: approval required)
  │
  ▼
 run          command calls CoreClient, returns data
  │
  ▼
 verify       data checked against the output schema
  │
  ▼
 render       human | json | ndjson | plain → stdout
  │
  ▼
 exit 0

Any failure at any step ──► map error ──► render error → stderr ──► exit code from table
```

`main()` owns this sequence. Commands only implement the `run` step.

---

## 7. Output model

### Streams

| Content | Stream |
|---|---|
| Primary data (results, JSON) | stdout |
| Errors, warnings, progress, hints, prompts | stderr |

stdout is a data contract. In `--json` mode it is either one valid document or empty.

### Formats

| Selector | Result | Audience |
|---|---|---|
| default on a TTY | Tables, colour, hints | People |
| `--json` | One versioned envelope | Scripts, agents |
| `--format ndjson` | One JSON object per line | Streaming and long lists |
| `--plain` | Stable line-based text, no colour or wrapping | `grep`, `awk` |

When stdout is not a TTY, colour, spinners and prompts switch off automatically. `NO_COLOR` and `--no-input` are honoured. `--json` implies non-interactive.

### Envelope

Every JSON response has the same outer shape:

- `schemaVersion`: string, bumped on breaking changes
- `ok`: boolean
- `data` (on success) or `error` (on failure)
- `meta`: optional, for example CLI version and the date the rule set was last verified

The JSON shape is a public API. Adding optional fields is safe. Removing, renaming or retyping fields requires a new `schemaVersion`.

---

## 8. Error model and exit codes

One error type, one translation point, one table.

- **Error fields:** stable `code`, human `message`, optional `hint` (what to do next), optional `details`, `retryable` flag, original `cause` (shown only with `--debug`).
- **Translation:** everything thrown anywhere is converted in `errors/map-error.ts`. Unknown errors become `INTERNAL`. Users never see a stack trace unless they ask.
- **Rendering:** human mode prints a short message and hint to stderr. `--json` mode prints the error envelope to stderr and leaves stdout empty.

### Exit codes

| Exit | Meaning |
|---|---|
| 0 | Success |
| 1 | Unexpected failure |
| 2 | Usage error (bad flag, missing argument) |
| 3 | Not found |
| 4 | Authentication or authorisation |
| 5 | Conflict (for example a locked period) |
| 6 | Service unavailable (retryable) |
| 7 | Approval required (proposed; see below) |
| 130 | Interrupted (Ctrl-C) |

Keep codes below 126, because higher ones are reserved by the shell for signals. Every code is listed in `--help`.

### Approval gate

The project requirements say the system proposes and a human approves, so anything with legal or financial effect (filing, posting a final entry, recording a dividend, closing a period) is a `commit` command. Such a command runs only when the person confirms interactively or passes an explicit approval flag. In a non-interactive run with neither, it stops with exit 7 and a hint. Approvals are recorded by core's audit log, not by the CLI.

---

## 9. Configuration

Resolved once, immutable afterwards, handed to commands through `Context`. Highest priority first:

1. Command-line flags
2. Environment variables
3. Project config file (searched upward from the working directory)
4. User config file (XDG config directory)
5. Built-in defaults

The config is limited to CLI behaviour (output format, colour, which company profile to use, paths). Tax rates, thresholds and deadlines live in core's versioned rules table, never in CLI config.

---

## 10. I/O and terminal behaviour

All terminal access goes through one stream abstraction with real and in-memory implementations. It reports:

- whether each stream is a TTY and its width
- whether colour is allowed
- whether prompting is allowed

Signals: Ctrl-C exits quickly with 130 and bounded cleanup. A closed pipe (for example `| head`) exits quietly.

---

## 11. Planned command tree

Each group maps to a module in the project requirements. Names are provisional.

| Group | Covers | Typical effect level |
|---|---|---|
| `company` | Company profile, financial year, VAT and TSD toggles | read / commit |
| `obligations` | Obligation list, calendar, status, reminders | read / prepare |
| `docs` | Invoice and receipt intake, extraction review, duplicates | prepare |
| `bank` | Import transactions, reconciliation, unmatched items | prepare |
| `ledger` | Entries, trial balance, balance sheet, P&L, month and year close | read / commit |
| `filings` | Annual report pack, KMD and TSD packs, dividend guard, approvals and receipts | prepare / commit |
| `registry` | Board, shareholders, UBOs, contact person, legal address, expiries | read / commit |
| `vault` | Records search, resolutions, contracts, full data export | read |
| `assistant` | Rule Q&A with citations, anomaly review, drafts | prepare |
| `audit` | Audit log queries and export | read |

The AI assistant group only ever produces `prepare` results. It never commits.

---

## 12. Testing strategy

| Layer | What it proves |
|---|---|
| **In-process command tests** | For each command: exit code, stdout and stderr, using fake streams and a fake client |
| **Contract tests** | Every command's JSON output validates against its output schema, and schemas are snapshotted so breaking changes fail CI |
| **Error tests** | Every error code produces the right exit code and envelope |
| **Registry tests** | The command registry is valid: no duplicates, no reserved flags, all schemas present |
| **Approval tests** | Every `commit` command refuses to run non-interactively without approval |
| **Golden help tests** | Help text for each command is stable |
| **A few subprocess tests** | Real binary: pipes, non-TTY, Ctrl-C, closed pipe |

---

## 13. Review checklist

- [ ] The command returns data and does not print or exit
- [ ] Input and output schemas are declared
- [ ] The effect level is declared, and `commit` commands use the approval gate
- [ ] Expected failures use a code from the code table, with a hint where useful
- [ ] No `process.*` access outside `bin.ts`
- [ ] No imports from core except through the `CoreClient` interface
- [ ] stdout carries data only
- [ ] JSON output is unchanged, or `schemaVersion` is bumped
- [ ] New exit codes are added to this README and to `--help`
- [ ] Tests cover success, at least one failure, and the JSON contract