# Turnstile Implementation Plan

## Overview

Build a symbolic logic teaching web app with offline-first architecture. Monorepo with shared engine.

## Project Structure

```
/workspace/
├── package.json                 # Workspace root (pnpm workspaces)
├── pnpm-workspace.yaml
├── tsconfig.base.json           # Shared TS config
├── packages/
│   ├── engine/                  # Pure TypeScript - no browser deps
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts         # Public API exports
│   │       ├── types.ts         # Formula, ProofStep, Problem, etc.
│   │       ├── parser/
│   │       │   ├── lexer.ts
│   │       │   ├── parser.ts    # Recursive descent parser
│   │       │   └── printer.ts   # AST to string (ASCII/UTF-8)
│   │       ├── validator/
│   │       │   ├── rules.ts     # Inference rule definitions
│   │       │   ├── validator.ts # Proof step validation
│   │       │   └── checker.ts   # Full proof checker
│   │       └── truth-table/
│   │           ├── evaluate.ts  # Formula evaluation
│   │           └── generate.ts  # Truth table generation
│   │
│   └── client/                  # SolidJS app
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── vitest.config.ts
│       ├── index.html
│       └── src/
│           ├── index.tsx        # Entry point
│           ├── App.tsx          # Root component + routing
│           ├── components/
│           │   ├── proof/       # Proof builder components
│           │   ├── playground/  # Formula playground
│           │   ├── problems/    # Problem set UI
│           │   └── ui/          # Shared UI primitives
│           ├── stores/          # Solid stores/signals
│           ├── storage/         # IndexedDB adapter
│           ├── data/            # Bundled problem sets (JSON)
│           └── styles/          # Tailwind + global CSS
```

---

## Phase 1: Project Scaffolding

### 1.1 Root Workspace Setup

**Files to create:**

- `package.json` - pnpm workspace root
- `pnpm-workspace.yaml` - workspace config
- `tsconfig.base.json` - shared TypeScript settings
- `.gitignore` - Node/TS ignores

### 1.2 Engine Package Setup

**Files to create:**

- `packages/engine/package.json` - name: `@turnstile/engine`
- `packages/engine/tsconfig.json` - extends base, pure ESM
- `packages/engine/vitest.config.ts`
- `packages/engine/src/index.ts` - barrel exports

### 1.3 Client Package Setup

**Files to create:**

- `packages/client/package.json` - depends on `@turnstile/engine`
- `packages/client/tsconfig.json`
- `packages/client/vite.config.ts` - SolidJS plugin, path aliases
- `packages/client/vitest.config.ts`
- `packages/client/index.html`
- `packages/client/src/index.tsx`
- `packages/client/src/App.tsx`
- `packages/client/tailwind.config.js`
- `packages/client/postcss.config.js`

---

## Phase 2: Core Engine

### 2.1 Type Definitions

**File:** `packages/engine/src/types.ts`

Define all core types from specs:
- `Formula` (discriminated union AST)
- `InferenceRule` (union of rule names)
- `ProofStep`
- `Problem`, `Submission`
- `RuleDefinition`, `UserProgress`, `ProvenTheorem`
- `TruthTableProblem`, `TruthTableSubmission`, `TruthTableRow`

### 2.2 Formula Parser

**Files:**
- `packages/engine/src/parser/lexer.ts` - tokenize input
- `packages/engine/src/parser/parser.ts` - recursive descent, builds AST
- `packages/engine/src/parser/printer.ts` - AST → string (ASCII/UTF-8 modes)

**Token types:** `VAR`, `NOT`, `AND`, `OR`, `IMPLIES`, `IFF`, `BOTTOM`, `LPAREN`, `RPAREN`, `EOF`

**Grammar (precedence low→high):**
```
formula     → iff
iff         → implies (('<->' | IFF) implies)*
implies     → or (('->' | IMPLIES) or)*      // right-associative
or          → and (('\/' | '|' | OR) and)*
and         → unary (('/\' | '&' | AND) unary)*
unary       → ('~' | NOT) unary | primary
primary     → VAR | BOTTOM | '(' formula ')'
```

### 2.3 Truth Table Generator

**Files:**
- `packages/engine/src/truth-table/evaluate.ts` - evaluate Formula given variable assignments
- `packages/engine/src/truth-table/generate.ts` - generate all rows, extract variables

### 2.4 Proof Validator

**Files:**
- `packages/engine/src/validator/rules.ts` - rule schemas and validation logic per rule
- `packages/engine/src/validator/validator.ts` - validate single step
- `packages/engine/src/validator/checker.ts` - validate entire proof

**Inference rules (Kalish-Montague):**

| Rule | Premises | Conclusion |
|------|----------|------------|
| `assumption` | (opens subproof) | any formula |
| `and_intro` | A, B | A ∧ B |
| `and_elim_l` | A ∧ B | A |
| `and_elim_r` | A ∧ B | B |
| `or_intro_l` | A | A ∨ B |
| `or_intro_r` | B | A ∨ B |
| `or_elim` | A∨B, subproof(A→C), subproof(B→C) | C |
| `implies_intro` | subproof(A→B) | A → B |
| `implies_elim` | A → B, A | B |
| `not_intro` | subproof(A→⊥) | ¬A |
| `not_elim` | ¬¬A | A |
| `iff_intro` | A→B, B→A | A ↔ B |
| `iff_elim` | A↔B, A or B | B or A |
| `bottom_elim` | ⊥ | any |
| `raa` | subproof(¬A→⊥) | A |
| `theorem` | (none) | proven theorem |

**Validation approach:**
1. Check justification references exist and are accessible (not inside closed subproofs)
2. Check rule-specific schema matches
3. Track subproof depth/scope

### 2.5 Engine Tests

**Files:**
- `packages/engine/src/parser/__tests__/parser.test.ts`
- `packages/engine/src/truth-table/__tests__/generate.test.ts`
- `packages/engine/src/validator/__tests__/validator.test.ts`

---

## Phase 3: Persistence Layer

### 3.1 Storage Port Interface

**File:** `packages/client/src/storage/types.ts`

Define `StoragePort` interface from specs.

### 3.2 IndexedDB Adapter

**File:** `packages/client/src/storage/indexeddb-adapter.ts`

Implement `IndexedDBAdapter`:
- Database: `turnstile-db`
- Object stores: `problems`, `submissions`, `truthTableProblems`, `truthTableSubmissions`, `progress`
- Schema versioning with migrations
- Export functionality for grading

### 3.3 Storage Context

**File:** `packages/client/src/storage/context.tsx`

SolidJS context provider for storage access throughout app.

---

## Phase 4: Problem Data

### 4.1 Bundled Problems

**Files:**
- `packages/client/src/data/problems.json` - ~20 MVP problems across 5 difficulty levels
- `packages/client/src/data/truth-table-problems.json` - ~10 truth table exercises
- `packages/client/src/data/rules.json` - primitive + derived rule definitions

**Problem categories (~20 total):**
1. Basic connectives (difficulty 1-2) - ~5 problems
2. Implication proofs (difficulty 2-3) - ~5 problems
3. Negation and contradiction (difficulty 3-4) - ~5 problems
4. Combined/advanced (difficulty 4-5) - ~5 problems

**Derivation problems (unlock derived rules):**
- Modus Tollens (MT): `P→Q, ¬Q ⊢ ¬P`
- Hypothetical Syllogism (HS): `P→Q, Q→R ⊢ P→R`
- Disjunctive Syllogism (DS): `P∨Q, ¬P ⊢ Q`
- Exportation (Exp): `(P∧Q)→R ⊢ P→(Q→R)`

### 4.2 Data Loader

**File:** `packages/client/src/data/loader.ts`

Load bundled JSON, seed IndexedDB on first run.

---

## Phase 5: UI Components

### 5.1 UI Primitives

**Files in `packages/client/src/components/ui/`:**
- `Button.tsx`
- `Input.tsx`
- `Select.tsx`
- `Modal.tsx`
- `Tooltip.tsx`
- `Badge.tsx` (for difficulty levels)

### 5.2 Formula Components

**Files in `packages/client/src/components/playground/`:**
- `FormulaInput.tsx` - text input with real-time parsing
- `FormulaDisplay.tsx` - renders Formula AST (ASCII/UTF-8 toggle)
- `ParseError.tsx` - syntax error display
- `TruthTable.tsx` - renders generated truth table
- `Playground.tsx` - main playground container

### 5.3 Proof Builder Components

**Files in `packages/client/src/components/proof/`:**
- `ProofLine.tsx` - single proof step display
- `ProofWorkspace.tsx` - main proof editing area
- `Subproof.tsx` - nested subproof container (indented)
- `RulePalette.tsx` - rule selection (tap on mobile)
- `JustificationPicker.tsx` - select lines for justification
- `StepEditor.tsx` - add/edit proof step
- `ValidationFeedback.tsx` - error messages, hints
- `ProofBuilder.tsx` - main container

### 5.4 Problem Components

**Files in `packages/client/src/components/problems/`:**
- `ProblemCard.tsx` - problem preview (premises → conclusion)
- `ProblemList.tsx` - filterable list by difficulty/status
- `ProblemView.tsx` - full problem with proof builder
- `ProgressBar.tsx` - completion status
- `DifficultyBadge.tsx`

### 5.5 Layout Components

**Files in `packages/client/src/components/layout/`:**
- `Header.tsx` - nav, settings toggle
- `Layout.tsx` - responsive shell
- `MobileNav.tsx` - bottom nav for mobile

---

## Phase 6: Pages & Routing

### 6.1 Router Setup

**File:** `packages/client/src/App.tsx`

Use `@solidjs/router`:
- `/` - Home/landing
- `/playground` - Formula playground
- `/problems` - Problem list
- `/problems/:id` - Individual problem
- `/truth-tables` - Truth table exercises
- `/truth-tables/:id` - Individual truth table problem
- `/progress` - User progress overview

### 6.2 Page Components

**Files in `packages/client/src/pages/`:**
- `Home.tsx`
- `PlaygroundPage.tsx`
- `ProblemsPage.tsx`
- `ProblemDetailPage.tsx`
- `TruthTablesPage.tsx`
- `TruthTableDetailPage.tsx`
- `ProgressPage.tsx`

---

## Phase 7: State Management

### 7.1 Global Stores

**Files in `packages/client/src/stores/`:**
- `settings.ts` - display mode (ASCII/UTF-8), theme
- `progress.ts` - unlocked rules, completed problems
- `currentProof.ts` - active proof state
- `currentProblem.ts` - active problem

---

## Phase 8: PWA & Offline

### 8.1 Service Worker

**File:** `packages/client/public/sw.js`

Cache-first strategy for static assets, network-first for nothing (fully offline app).

### 8.2 Manifest

**File:** `packages/client/public/manifest.json`

PWA manifest with icons, theme colors, display mode.

### 8.3 Registration

**File:** `packages/client/src/sw-register.ts`

Register service worker on app load.

---

## Phase 9: Polish & Testing

### 9.1 Client Tests

- Component tests with Solid Testing Library
- Integration tests for proof validation flow
- Storage adapter tests

### 9.2 Accessibility

- Keyboard navigation for proof builder
- ARIA labels for interactive elements
- Focus management in modals

### 9.3 Mobile Responsiveness

- Test touch interactions
- Responsive breakpoints for proof workspace
- Fixed bottom rule palette on mobile

---

## Implementation Order

| Step | Description | Dependencies |
|------|-------------|--------------|
| 1 | Project scaffolding (Phase 1) | None |
| 2 | Engine types (2.1) | Step 1 |
| 3 | Parser (2.2) | Step 2 |
| 4 | Truth tables (2.3) | Step 3 |
| 5 | Proof validator (2.4) | Step 3 |
| 6 | Engine tests (2.5) | Steps 3-5 |
| 7 | Storage layer (Phase 3) | Step 2 |
| 8 | Problem data (Phase 4) | Step 7 |
| 9 | UI primitives (5.1) | Step 1 |
| 10 | Formula components (5.2) | Steps 3, 9 |
| 11 | Proof components (5.3) | Steps 5, 9 |
| 12 | Problem components (5.4) | Steps 8, 11 |
| 13 | Routing & pages (Phase 6) | Steps 10-12 |
| 14 | State management (Phase 7) | Step 13 |
| 15 | PWA setup (Phase 8) | Step 13 |
| 16 | Testing & polish (Phase 9) | All above |

---

## Key Implementation Notes

1. **Parser precedence:** Implication is right-associative; others are left-associative
2. **Subproof scoping:** Steps inside closed subproofs are not accessible as justifications
3. **Rule unlocking:** Derived rules require completing a specific "derivation" problem
4. **Theorem citing:** Users can cite their own proven theorems via `rule: 'theorem'`
5. **Schema versioning:** All persisted objects include `schemaVersion` for migrations
6. **No server required:** MVP is fully static, deployable to any CDN
