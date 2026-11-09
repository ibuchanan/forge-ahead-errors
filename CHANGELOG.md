# Changelog

All notable changes to this project are documented here.

## [0.4.0] - 2026-11-09

### 🚀 Features

- _(errors)_ Type optional problem code
- _(errors)_ Add caller-defined domain problems
- _(errors)_ Add app-owned problem catalogs
- _(errors)_ Guard problems with safe integer codes

### 📚 Documentation

- Apply updated Biome formatting
- _(errors)_ Document domain problem codes
- Improve package entry and error guidance

## [0.3.4] - 2026-11-08

### 💼 Other

- _(deps)_ Upgrade development dependencies and Vitest config

### 📚 Documentation

- _(readme)_ Fix documentation links and development references
- Reorganize documentation into Diatasis directories

### 🧪 Testing

- _(problem-details)_ Organize Vitest imports for globals: false

### ⚙️ Miscellaneous Tasks

- _(config)_ Update ignore, Biome, and cliff configuration
## [0.3.3] - 2026-10-02

### 💼 Other

- Validate package output on push
- Rely on pre-push release checks
- Build before checking package contents

## [0.3.2] - 2026-10-02

### 💼 Other

- Use JSON for tsdown configuration

## [0.3.1] - 2026-09-10

### 💼 Other

- _(deps)_ Upgrade development dependencies

## [0.3.0] - 2026-08-09

### 🚀 Features

- _(testing)_ Add Result assertion helpers for tests

## [0.2.2] - 2026-08-09

### 🚜 Refactor

- _(errors)_ Improve error module locality

## [0.2.1] - 2026-08-09

### 🐛 Bug Fixes

- _(errors)_ Harden HTTP error normalization
- _(errors)_ Isolate StandardError registry

### 💼 Other

- _(release)_ Make release checks reproducible

### 📚 Documentation

- Add Forge error-handling documentation

### ⚙️ Miscellaneous Tasks

- _(lefthook)_ Simplify output

## [0.2.0] - 2026-07-25

### 🚀 Features

- Add problemDetails, validateHttpResponse, and error context

## [0.1.3] - 2026-07-23

### 🐛 Bug Fixes

- _(build)_ Emit dual ESM/CJS output for Forge bundler compatibility

## [0.1.2] - 2026-07-19

### 🐛 Bug Fixes

- _(build)_ Fix prepare script breaking git-dependency installs

### 📚 Documentation

- _(changelog)_ Regenerate full changelog history

## [0.1.1] - 2026-07-19

### 🐛 Bug Fixes

- _(build)_ Stabilize install-time build

### ⚙️ Miscellaneous Tasks

- _(build)_ Update release and linting configuration
- _(release)_ V0.1.1

## [0.1.0] - 2026-07-08

### 🚀 Features

- _(errors)_ Pre-register the full IANA 4xx/5xx status set

### 🐛 Bug Fixes

- Rollback vitest to 4.1
- _(build)_ Fix monorepo leftovers blocking git-dependency installs

### 📚 Documentation

- _(oss)_ Owner, contributing, license fixes from template

### 🧪 Testing

- _(errors)_ Use match() so tests read as real library usage

### ⚙️ Miscellaneous Tasks

- Set type to module and sort
