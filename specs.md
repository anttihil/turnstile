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
}

// Inference rules (natural deduction)
type InferenceRule =
  | 'assumption'
  | 'and_intro' | 'and_elim_l' | 'and_elim_r'
  | 'or_intro_l' | 'or_intro_r' | 'or_elim'
  | 'implies_intro' | 'implies_elim'
  | 'not_intro' | 'not_elim'
  | 'iff_intro' | 'iff_elim'
  | 'bottom_elim' | 'raa';

// Problem definition
interface Problem {
  id: string;
  premises: Formula[];
  conclusion: Formula;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hint?: string;
  tags?: string[];
  systemId?: string;  // Required proof system, or null for any
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
  hintsUsed: number;
  systemId: string;          // Which proof system was used
  clientVersion: string;     // App version for compatibility
}

// Batch export for grading
interface SubmissionExport {
  exportedAt: string;
  clientVersion: string;
  submissions: Submission[];
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

## UX Principles

1. **Keyboard-first, mouse-friendly** — Power users type, beginners click
2. **Errors that teach** — Explain *why* something is invalid, not just that it is
3. **Progressive disclosure** — Don't overwhelm; reveal complexity as mastery grows
4. **Instant feedback** — Validate on every keystroke, not on submit
5. **No dead ends** — Always provide a hint or next step

---

## Proof Systems

Default to **Kalish-Montague** (similar to Fitch-style) for natural deduction.

The architecture should support multiple proof systems via a pluggable interface:

```typescript
interface ProofSystem {
  id: string;
  name: string;
  rules: InferenceRule[];
  validate: (step: ProofStep, context: ProofContext) => ValidationResult;
  format: (proof: Proof) => FormattedProof;
}

// Built-in systems
const systems: ProofSystem[] = [
  kalishMontague,   // Default
  fitchStyle,       // Alternative
  gentzenNK,        // Natural deduction (future)
  sequentCalculus,  // LK/LJ (future)
];
```

Users can switch systems in settings. Problems may specify a required system or allow any.

---

## Mobile Support

Mobile is a first-class target. Key adaptations:

**Rule Palette**
- Tap-to-apply rule buttons instead of typing abbreviations
- Grouped by category: Introduction, Elimination, Structural
- Long-press for rule description/help

```
┌─────────────────────────────────────┐
│  ∧I   ∧E   ∨I   ∨E   →I   →E   ¬I  │
│  ¬E   ↔I   ↔E   ⊥E   RAA  ASM      │
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
