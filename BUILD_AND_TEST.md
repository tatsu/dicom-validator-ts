# Build & Test Guide

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (included with Node.js)

## Setup

```bash
# Clone the repository
git clone https://github.com/tatsu/dicom-validator-ts.git
cd dicom-validator-ts

# Install dependencies
npm install
```

---

## Build

### Build Tool

- **tsup** — produces dual ESM (`.mjs`) and CJS (`.cjs`) output with type declarations (`.d.ts`)

### Entry Points

| Entry | Description |
|-------|-------------|
| `src/index.ts` | Library API |
| `src/cli/index.ts` | CLI tool |

### Build Command

```bash
npm run build
```

Output directory: `dist/`

### Type Check (no emit)

```bash
npm run lint
```

Runs TypeScript with `--noEmit` to detect type errors without producing output files.

---

## Test

### Frameworks

- **Vitest** — test runner
- **fast-check** (`@fast-check/vitest`) — property-based testing

### Test File Conventions

| Pattern | Type |
|---------|------|
| `*.test.ts` | Unit tests (co-located with source) |
| `*.prop.test.ts` | Property-based tests |

### Test Commands

```bash
# Run all tests
npm run test

# Run a specific test file
npx vitest run src/validators/tag-validator.test.ts

# Watch mode (re-runs on file changes)
npx vitest

# Run with coverage
npx vitest run --coverage
```

### Coverage Configuration

| Metric | Threshold |
|--------|-----------|
| Lines | 90% |
| Branches | 80% |

- Provider: `v8`
- Included: `src/**/*.ts`
- Excluded: `src/**/*.test.ts`, `src/cli/**`

---

## Documentation

```bash
# Start dev server
npm run docs:dev

# Build static docs
npm run docs:build

# Preview built docs
npm run docs:preview
```

---

## Command Summary

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build with tsup (ESM + CJS) |
| `npm run lint` | TypeScript type check |
| `npm run test` | Run all tests |
| `npx vitest run <file>` | Run a specific test file |
| `npx vitest` | Run tests in watch mode |
| `npx vitest run --coverage` | Run tests with coverage |
| `npm run docs:dev` | Documentation dev server |
| `npm run docs:build` | Build documentation |
