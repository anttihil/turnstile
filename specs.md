# Description

**turnstile** is a web app for teaching symbolic logic.

## Goals

- Make symbolic logic accessible and engaging for beginners
- Provide immediate feedback on proof attempts
- Support progressive learning from propositional to predicate logic
- Minimize friction—no account required to start practicing

---

## Features

### MVP (v1)

**Interactive Proof Builder**
- Natural deduction proof construction
- Step-by-step validation with meaningful error messages
- Hints system that reveals just enough to unstick learners

**Live Formula Playground**
- Real-time parsing with syntax highlighting
- Instant truth table generation
- Well-formed formula validation as you type

**Problem Sets**
- Curated problems across 5 difficulty levels
- Propositional logic only (MVP scope)
- Progress tracking (local storage initially)

### Future (v2+)

- Predicate logic (quantifiers)
- Gamification (leaderboards, timed challenges)
- Collaborative proofs (multiplayer)
- User accounts with cloud sync
- Proof replay and debugging
- Export proofs to LaTeX

---

## Notation

Use ASCII input with optional UTF-8 display. No KaTeX dependency.

| Concept        | UTF Symbol | ASCII Input   |
|----------------|------------|---------------|
| And            | ∧          | `/\` or `&`   |
| Or             | ∨          | `\/` or `\|`  |
| Not            | ¬          | `~`           |
| Implies        | →          | `->`          |
| Biconditional  | ↔          | `<->`         |
| Turnstile      | ⊢          | `\|-`         |
| Bottom         | ⊥          | `_\|_`        |

User setting toggles between ASCII-only and UTF-8 display.

---

## Tech Stack

| Layer           | Choice                              |
|-----------------|-------------------------------------|
| Framework       | SolidJS + SolidStart                |
| Language        | TypeScript                          |
| Styling         | Tailwind CSS                        |
| State           | Solid signals/stores (built-in)     |
| Font            | JetBrains Mono or Fira Code         |
| Testing         | Vitest + Solid Testing Library      |
| Deployment      | Vercel or Cloudflare Pages (static) |
| Persistence     | IndexedDB via adapter (offline-first)|
| Offline         | PWA with service worker             |

---

## Data Model (Draft)

```typescript
// Formula AST
type Formula =
  | { kind: 'var'; name: string }
  | { kind: 'not'; operand: Formula }
  | { kind: 'and'; left: Formula; right: Formula }
  | { kind: 'or'; left: Formula; right: Formula }
  | { kind: 'implies'; left: Formula; right: Formula }
  | { kind: 'iff'; left: Formula; right: Formula }
  | { kind: 'bottom' };

// Proof step
interface ProofStep {
  id: string;
  formula: Formula;
  rule: InferenceRule;
  justification: string[];  // IDs of supporting steps
  depth: number;            // For subproof nesting
  theoremId?: string;       // For rule='theorem', references ProvenTheorem.id
}

// Inference rules (natural deduction)
type InferenceRule =
  | 'assumption'
  | 'and_intro' | 'and_elim_l' | 'and_elim_r'
  | 'or_intro_l' | 'or_intro_r' | 'or_elim'
  | 'implies_intro' | 'implies_elim'
  | 'not_intro' | 'not_elim'
  | 'iff_intro' | 'iff_elim'
  | 'bottom_elim' | 'raa'
  | 'theorem';              // Citing a previously-proven theorem

// Problem definition
interface Problem {
  id: string;
  type: 'exercise' | 'derivation';  // derivation = unlocks a rule when proven
  premises: Formula[];
  conclusion: Formula;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hint?: string;
  tags?: string[];
  unlocksRule?: string;             // Rule ID unlocked by proving this (if type=derivation)
  requiredRules?: string[];         // Derived rules required to attempt
  ruleOverride?: {                  // Instructor override for rule availability
    mode: 'allow' | 'restrict';
    rules: string[];
  };
  schemaVersion: number;
}

// User's proof attempt (stored locally, synced later)
interface Submission {
  id: string;
  problemId: string;
  userId?: string;           // Set when user authenticates
  proof: ProofStep[];
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;         // ISO timestamp
  completedAt?: string;
  attempts: number;          // How many times submitted for validation
  hintsUsed: number;         // Visible to instructors, no automatic penalty
  clientVersion: string;     // App version for compatibility
  schemaVersion: number;
}

// Batch export for grading
interface SubmissionExport {
  exportedAt: string;
  clientVersion: string;
  submissions: Submission[];
}

// --- Instructor Feedback (design now, implement v2) ---

interface Feedback {
  id: string;
  submissionId: string;
  instructorId: string;
  createdAt: string;
  grade?: 'pass' | 'fail' | 'partial';
  score?: number;
  maxScore?: number;
  overallComment?: string;
  stepComments: StepComment[];
  schemaVersion: number;
}

interface StepComment {
  stepId: string;           // References ProofStep.id
  comment: string;
  type: 'error' | 'suggestion' | 'praise';
}

// --- Truth Table Exercises ---

interface TruthTableProblem {
  id: string;
  formula: Formula;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hint?: string;
  tags?: string[];
  schemaVersion: number;
}

interface TruthTableSubmission {
  id: string;
  problemId: string;
  userId?: string;
  variables: string[];      // Column headers, e.g., ['P', 'Q']
  rows: TruthTableRow[];
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  attempts: number;
  hintsUsed: number;
  clientVersion: string;
  schemaVersion: number;
}

interface TruthTableRow {
  inputs: boolean[];        // Values for each variable
  output: boolean;          // Student's answer for formula value
  correct?: boolean;        // Set after validation
}

// --- Prove-to-Use Progression ---

interface RuleDefinition {
  id: string;
  name: string;
  abbreviation: string;     // e.g., 'MT' for Modus Tollens
  category: 'primitive' | 'derived';
  unlockProblemId?: string; // Problem that unlocks this rule (if derived)
  description: string;
  schema: {
    premises: string[];     // e.g., ['P → Q', '¬Q']
    conclusion: string;     // e.g., '¬P'
  };
}

interface UserProgress {
  id: string;
  unlockedRules: string[];           // Derived rule IDs proven
  theoremLibrary: ProvenTheorem[];   // User's personal theorem library
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

interface ProvenTheorem {
  id: string;
  sourceSubmissionId: string;
  sourceProblemId: string;
  premises: Formula[];
  conclusion: Formula;
  name?: string;            // User-assigned name, e.g., "My DeMorgan Lemma"
  provenAt: string;
  schemaVersion: number;
}
```

---

## Persistence Architecture

Offline-first with adapter pattern for future server sync.

```typescript
// Port interface - app depends on this abstraction
interface StoragePort {
  // Problems
  getProblems(): Promise<Problem[]>;
  getProblem(id: string): Promise<Problem | null>;

  // Submissions
  saveSubmission(submission: Submission): Promise<void>;
  getSubmission(problemId: string): Promise<Submission | null>;
  getAllSubmissions(): Promise<Submission[]>;

  // Export for grading
  exportSubmissions(): Promise<SubmissionExport>;

  // Feedback (v2)
  importFeedback(feedback: Feedback[]): Promise<void>;
  getFeedback(submissionId: string): Promise<Feedback | null>;

  // Truth tables
  getTruthTableProblems(): Promise<TruthTableProblem[]>;
  saveTruthTableSubmission(sub: TruthTableSubmission): Promise<void>;
  getTruthTableSubmission(problemId: string): Promise<TruthTableSubmission | null>;

  // User progress (prove-to-use)
  getProgress(): Promise<UserProgress>;
  unlockRule(ruleId: string): Promise<void>;
  addTheorem(theorem: ProvenTheorem): Promise<void>;

  // Sync (no-op for local adapter)
  sync(): Promise<SyncResult>;
}

// MVP: Local adapter using IndexedDB
class IndexedDBAdapter implements StoragePort {
  // All data stored locally
  // exportSubmissions() returns JSON for manual upload/grading
  // sync() is a no-op, returns { status: 'offline' }
}

// Future: Server adapter
class ServerAdapter implements StoragePort {
  // Wraps IndexedDB for offline cache
  // sync() pushes pending submissions to server
  // Handles conflict resolution
}
```

**MVP Flow**
1. Problems bundled with app (static JSON, loaded into IndexedDB on first run)
2. User works offline, submissions saved to IndexedDB
3. Instructor can ask students to "Export submissions" → downloads JSON
4. Instructor uploads JSON to grading tool (separate, server-side)

**Future Flow**
1. User authenticates (optional)
2. App syncs when online, queues when offline
3. Instructor sees submissions in real-time dashboard

**Shared Engine**

The proof validation engine is a pure TypeScript module with no browser dependencies:

```
packages/
  engine/          # Pure TS - runs anywhere
    parser.ts      # Formula parsing
    validator.ts   # Proof validation
    systems/       # Kalish-Montague, Fitch, etc.
  client/          # SolidJS app (imports engine)
  server/          # Future Node.js API (imports same engine)
```

This ensures:
- Identical validation client-side and server-side
- Server can re-verify all submissions (don't trust client)
- Engine can be published as standalone npm package for other tools

---

## Schema Versioning

Data model will evolve. Strategy:

1. **`schemaVersion` field** on all persisted objects (Problem, Submission, etc.)
2. **Migration functions** in IndexedDB adapter: `migrate_v1_to_v2()`
3. **Forward compatibility:** Unknown fields ignored, not rejected
4. **Breaking changes:** Major version bump, migration required on app load

---

## UX Principles

1. **Keyboard-first, mouse-friendly** — Power users type, beginners click
2. **Errors that teach** — Explain *why* something is invalid, not just that it is
3. **Progressive disclosure** — Don't overwhelm; reveal complexity as mastery grows
4. **Instant feedback** — Validate on every keystroke, not on submit
5. **No dead ends** — Always provide a hint or next step

---

## Proof System

MVP uses **Kalish-Montague** (similar to Fitch-style) for natural deduction.

Multiple proof systems (Fitch, Gentzen, Sequent Calculus) are a v2+ consideration. The plugin architecture will be designed when a second system is actually needed—YAGNI.

---

## Prove-to-Use Progression

Users unlock derived rules by proving them first. This creates a natural learning progression where mastery is demonstrated through construction.

**How it works:**

1. **Primitive rules** are available from the start (∧I, ∧E, ∨I, ∨E, →I, →E, ¬I, ¬E, ⊥E, RAA, assumption)
2. **Derived rules** (Modus Tollens, Hypothetical Syllogism, etc.) start locked
3. User proves a derivation problem → unlocks the corresponding rule
4. Unlocked rules can be used as shortcuts in future proofs
5. **Theorem library:** Users can save proven theorems and cite them in future proofs

**Instructor overrides:**

Problems can specify `ruleOverride` to control which rules are available:
- `mode: 'allow'` — Only the listed rules are available (ignores user's unlocks)
- `mode: 'restrict'` — User's unlocks minus the listed rules

This lets instructors create "use only primitives" assignments even for advanced students.

---

## Mobile Support

Mobile is a first-class target. Key adaptations:

**Rule Palette**
- Tap-to-apply rule buttons instead of typing abbreviations
- Grouped by category: Primitive, Derived (unlockable), My Theorems
- Long-press for rule description/help
- Locked rules shown grayed with lock icon

```
┌─────────────────────────────────────┐
│  Primitive Rules                    │
│  ∧I  ∧E  ∨I  ∨E  →I  →E  ¬I  ¬E   │
├─────────────────────────────────────┤
│  Derived Rules                      │
│  MT✓  HS✓  DS🔒  Exp🔒  ...         │
├─────────────────────────────────────┤
│  My Theorems                        │
│  T1  T2  T3  ...                    │
└─────────────────────────────────────┘
```

**Responsive Layout**
- Desktop: Side-by-side (problem | proof workspace)
- Mobile: Stacked (problem on top, proof below, palette fixed at bottom)

**Touch Interactions**
- Tap line to select as justification
- Swipe to delete step
- Pinch to collapse/expand subproofs

---

## Open Questions

- [ ] Accessibility requirements (screen reader support for proofs)?

---

## Deferred (v2+)

**Collaborative Proofs:** Real-time collaborative proofs require significant architectural changes (CRDT/OT, WebSocket infrastructure, conflict resolution). This will be designed from scratch if/when prioritized. Current data model intentionally does not include collaboration fields to avoid premature complexity.

**Multiple Proof Systems:** Plugin architecture for Fitch, Gentzen, Sequent Calculus will be designed when a second system is actually needed.
