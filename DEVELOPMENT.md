# Development guide

This guide covers the contributor workflow for `@forge-ahead/errors`. For the package purpose, runtime support, and basic API usage, start with [README.md](README.md).

## Prerequisites

- Node.js 22 (the repository pins this major version in [`.nvmrc`](.nvmrc)).
- npm.
- Git, for changelog and release commands.

Install dependencies from the lockfile:

```sh
npm ci
```

The `prepare` lifecycle script builds the package and attempts to install Lefthook hooks. A hook-install failure does not fail dependency installation.

## Daily development loop

Run the complete local verification suite before opening a pull request:

```sh
npm run check
```

`check` runs, in order:

1. `npm run format:check` — checks formatting with Biome.
2. `npm run lint:check` — runs Biome linting.
3. `npm run typecheck` — runs `tsc --noEmit`.
4. `npm run test` — runs the Vitest suite once.
5. `npm run build` — builds distributable output with tsdown.

Use these focused commands while iterating:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Rebuild the package when source files change. |
| `npm test` | Run tests once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run test:coverage` | Generate terminal, JSON, and HTML coverage reports in `coverage/`. |
| `npm run typecheck` | Check TypeScript types without emitting files. |
| `npm run format` | Apply Biome formatting. |
| `npm run format:check` | Check formatting without modifying files. |
| `npm run lint:check` | Run Biome lint checks. |
| `npm run lint:fix` | Apply Biome lint fixes. |
| `npm run clean` | Remove `node_modules/`, `dist/`, and `coverage/`. |

Lefthook configures a pre-commit formatting hook and pre-push checks for linting, formatting, and tests.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/errors.ts` | Package implementation and public API exports. |
| `test/errors.test.ts` | Vitest coverage for error types and conversion helpers. |
| `tsdown.config.ts` | Produces the `index` entrypoint in ESM and CommonJS formats for Node.js 22. |
| `package.json` | Package metadata, conditional exports, npm scripts, and tool versions. |
| `biome.json` | Formatting and lint configuration. |
| `vitest.config.ts` | Node-based Vitest and V8 coverage configuration. |
| `CHANGELOG.md` | Generated release history. |
| `scripts/release-prepare.sh` | Release preparation automation. |

## Build output and package contents

`npm run build` emits the public package into `dist/`:

- `index.mjs` and `index.d.mts` for ESM consumers.
- `index.cjs` and `index.d.cts` for CommonJS consumers.
- Source maps for both JavaScript formats.

Check the files npm would include without publishing a tarball:

```sh
npm run pack:check
```

## Changelog and releases

Generate an unreleased changelog section from conventional commits:

```sh
npm run changelog
```

Run the release preflight before preparing a release:

```sh
npm run release:check
```

It runs `check`, coverage tests, and `pack:check`.

`npm run release:prepare` is a maintainer-only command. It determines the next version with `git cliff`, runs the release preflight, updates `package.json`, `package-lock.json`, and `CHANGELOG.md`, then creates a release commit and tag and pushes `main` plus that tag to `origin`. Run it only from the intended release branch with a clean, reviewed working tree and push permission.

## Troubleshooting

- **Wrong Node.js version:** select Node.js 22 before installing dependencies or running checks.
- **Generated output is stale:** run `npm run build`, or use `npm run dev` during source changes.
- **Unexpected local artifacts:** run `npm run clean`, then `npm ci` and `npm run check`.
- **Formatting or lint failures:** use `npm run format` and, where appropriate, `npm run lint:fix`, then rerun `npm run check`.
