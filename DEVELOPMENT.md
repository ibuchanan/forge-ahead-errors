# Development guide

<!-- cspell:words neverthrow Diátaxis -->

This is the contributor workflow for `@forge-ahead/errors`. For first use and package fit, start with the [README](README.md); for public behavior and task examples, use the [documentation](docs/reference/reference.md).

## Set up a checkout

Use Node.js 22 (pinned in [`.nvmrc`](.nvmrc)), npm, and Git. From the repository root:

```sh
npm ci
npm run check
```

`npm ci` installs from the lockfile. The `prepare` script builds `dist/` and attempts to install Lefthook hooks; a hook-install failure does not fail installation. The package is marked private, so this checkout cannot be installed by package name from the public npm registry.

## Work on a change

1. Edit the implementation under `src/` and add or update a matching test under `test/`.
2. Run `npm test` and `npm run typecheck` while iterating. Use `npm run test:watch` for repeated test runs.
3. Run `npm run check` before opening a pull request. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for collaboration rules.

`check` delegates to Lefthook: lint (Biome lint, formatting, and TypeScript typechecking), tests, and `pack:check` run in parallel. `pack:check` builds the package and runs `npm pack --dry-run --ignore-scripts` to inspect the publishable files without publishing. Pre-commit runs the repository formatter and stages formatting fixes; pre-push runs `check`.

| Command                 | Use                                                    |
| ----------------------- | ------------------------------------------------------ |
| `npm test`              | Run the Vitest suite once.                             |
| `npm run test:watch`    | Run Vitest in watch mode.                              |
| `npm run test:coverage` | Run tests with V8 coverage in `coverage/`.             |
| `npm run typecheck`     | Typecheck without emitting files.                      |
| `npm run format`        | Format supported files with Biome.                     |
| `npm run format:check`  | Check formatting without modifying files.              |
| `npm run lint:check`    | Run Biome lint.                                        |
| `npm run lint:fix`      | Apply supported Biome lint fixes.                      |
| `npm run build`         | Rebuild `dist/`.                                       |
| `npm run pack:check`    | Build and inspect npm package contents without upload. |
| `npm run clean`         | Remove `dist/` and `coverage/`.                        |

Biome also formats Markdown in this repository. Keep documentation changes in the appropriate [tutorial](docs/tutorial/tutorial-validate-upstream-responses.md), [how-to](docs/how-to/how-to-define-domain-problems.md), [reference](docs/reference/reference.md), or [explanation](docs/explanation/explanation-typed-errors-at-forge-boundaries.md); keep the README a short entry point.

## Find the relevant code

| Path                                              | Responsibility                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/errors.ts`                                   | Root public facade and `neverthrow` re-exports.                           |
| `src/problem-details.ts`                          | Problem Details shapes, `StandardError` HTTP registry, and normalization. |
| `src/domain-problem.ts`                           | Independent application-owned problem definitions and catalogs.           |
| `src/http-response.ts`                            | Bounded upstream HTTP error handling via `validateHttpResponse`.          |
| `src/testing.ts`, `src/testing/internal.ts`       | Vitest-oriented `expectOk`/`expectErr` helpers and internals.             |
| `test/*.test.ts`                                  | Vitest tests organized by feature.                                        |
| `docs/`                                           | Consumer-facing Diátaxis documentation.                                   |
| `scripts/build.sh`, `tsdown.config.json`          | Build pipeline and JS entrypoint settings.                                |
| `package.json`, `tsconfig.declarations.json`      | Conditional exports, scripts, and declaration generation.                 |
| `lefthook.yml`, `biome.jsonc`, `vitest.config.ts` | Hooks, formatting/lint, and test configuration.                           |
| `scripts/release-prepare.sh`, `cliff.toml`        | Release preparation and changelog rules.                                  |

Changes to the public API should be exported from `src/errors.ts`, covered by tests, and reflected in the [API reference](docs/reference/reference.md) and relevant how-to guides. Keep app-specific codes in a [downstream catalog](docs/how-to/how-to-create-a-downstream-error-registry.md), not in the shared HTTP registry.

## Build and inspect the package

`npm run build` uses tsdown to bundle the root and `./testing` entrypoints as ESM and CommonJS with source maps. It then runs TypeScript declaration-only generation and copies `.d.ts` files to `.d.cts` for CommonJS consumers. The corresponding exports in `package.json` point to files in `dist/`; only `dist/` is included in the npm package contents.

```sh
npm run build
npm run pack:check
```

Inspect the package dry-run output if you change exports or build configuration. The `./testing` subpath uses Vitest and declares it as an optional peer dependency; consumers using these helpers need Vitest. Do not edit generated `dist/` files directly.

## Prepare a release

To update the unreleased changelog, `npm run changelog` invokes `git cliff --offline --unreleased` and prepends the result to `CHANGELOG.md`. This command requires `git cliff` on the path and changes the changelog.

`npm run release:prepare` is a maintainer-only action. The script uses `git cliff` to calculate a version, updates `package.json`, `package-lock.json`, and `CHANGELOG.md`, commits and tags the release, then pushes `main` and the tag to `origin`. It does **not** itself run `check` or coverage. Use it only on the intended branch with a clean, reviewed tree, `git cliff` available, and permission to push; run `npm run check` first. See [CONTRIBUTING.md](CONTRIBUTING.md) for general pull request guidance rather than running release automation for ordinary changes.

## Troubleshoot a local checkout

- **Node version mismatch:** switch to Node.js 22 and reinstall with `npm ci`.
- **Stale declarations or exports:** run `npm run build`, then inspect `dist/` and `package.json` exports; use `npm run pack:check` to confirm package contents.
- **Formatting or lint failure:** run `npm run format` or `npm run lint:fix` as appropriate, review edits, then rerun `npm run check`.
- **Unexpected build or coverage artifacts:** run `npm run clean`, then `npm ci` and `npm run check`.
