// ============================================================================
// Formula AST
// ============================================================================

/**
 * Represents a propositional logic formula as an AST.
 * Uses discriminated union for type-safe pattern matching.
 */
export type Formula =
  | { kind: 'var'; name: string }
  | { kind: 'not'; operand: Formula }
  | { kind: 'and'; left: Formula; right: Formula }
  | { kind: 'or'; left: Formula; right: Formula }
  | { kind: 'implies'; left: Formula; right: Formula }
  | { kind: 'iff'; left: Formula; right: Formula }
  | { kind: 'bottom' };

// Formula constructors for convenience
export const Var = (name: string): Formula => ({ kind: 'var', name });
export const Not = (operand: Formula): Formula => ({ kind: 'not', operand });
export const And = (left: Formula, right: Formula): Formula => ({ kind: 'and', left, right });
export const Or = (left: Formula, right: Formula): Formula => ({ kind: 'or', left, right });
export const Implies = (left: Formula, right: Formula): Formula => ({ kind: 'implies', left, right });
export const Iff = (left: Formula, right: Formula): Formula => ({ kind: 'iff', left, right });
export const Bottom: Formula = { kind: 'bottom' };

// ============================================================================
// Inference Rules
// ============================================================================

/**
 * Natural deduction inference rules (Kalish-Montague style).
 */
export type InferenceRule =
  | 'assumption'
  | 'and_intro'
  | 'and_elim_l'
  | 'and_elim_r'
  | 'or_intro_l'
  | 'or_intro_r'
  | 'or_elim'
  | 'implies_intro'
  | 'implies_elim'
  | 'not_intro'
  | 'not_elim'
  | 'iff_intro'
  | 'iff_elim'
  | 'bottom_elim'
  | 'raa'
  | 'theorem';

/**
 * A single step in a proof.
 */
export interface ProofStep {
  id: string;
  formula: Formula;
  rule: InferenceRule;
  justification: string[];  // IDs of supporting steps
  depth: number;            // Subproof nesting level (0 = main proof)
  theoremId?: string;       // For rule='theorem', references ProvenTheorem.id
}

/**
 * Represents a subproof scope for tracking accessibility.
 */
export interface SubproofScope {
  startStepId: string;
  endStepId?: string;  // undefined if still open
  assumption: Formula;
  depth: number;
}

// ============================================================================
// Problems
// ============================================================================

/**
 * A proof problem definition.
 */
export interface Problem {
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

/**
 * User's proof attempt (stored locally, synced later).
 */
export interface Submission {
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

/**
 * Batch export for grading.
 */
export interface SubmissionExport {
  exportedAt: string;
  clientVersion: string;
  submissions: Submission[];
}

// ============================================================================
// Feedback (design now, implement v2)
// ============================================================================

export interface Feedback {
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

export interface StepComment {
  stepId: string;           // References ProofStep.id
  comment: string;
  type: 'error' | 'suggestion' | 'praise';
}

// ============================================================================
// Truth Table Exercises
// ============================================================================

export interface TruthTableProblem {
  id: string;
  formula: Formula;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hint?: string;
  tags?: string[];
  schemaVersion: number;
}

export interface TruthTableSubmission {
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

export interface TruthTableRow {
  inputs: boolean[];        // Values for each variable
  output: boolean;          // Student's answer for formula value
  correct?: boolean;        // Set after validation
}

// ============================================================================
// Prove-to-Use Progression
// ============================================================================

export interface RuleDefinition {
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

export interface UserProgress {
  id: string;
  unlockedRules: string[];           // Derived rule IDs proven
  theoremLibrary: ProvenTheorem[];   // User's personal theorem library
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface ProvenTheorem {
  id: string;
  sourceSubmissionId: string;
  sourceProblemId: string;
  premises: Formula[];
  conclusion: Formula;
  name?: string;            // User-assigned name, e.g., "My DeMorgan Lemma"
  provenAt: string;
  schemaVersion: number;
}

// ============================================================================
// Validation Results
// ============================================================================

export interface ValidationError {
  stepId: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ProofCheckResult {
  valid: boolean;
  complete: boolean;  // Does the proof reach the required conclusion?
  errors: ValidationError[];
}

// ============================================================================
// Parser Types
// ============================================================================

export type TokenType =
  | 'VAR'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'IMPLIES'
  | 'IFF'
  | 'BOTTOM'
  | 'LPAREN'
  | 'RPAREN'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export interface ParseError {
  message: string;
  position: number;
}

export type ParseResult<T> =
  | { success: true; value: T }
  | { success: false; error: ParseError };

// ============================================================================
// Display Options
// ============================================================================

export type DisplayMode = 'ascii' | 'utf8';

export interface DisplayOptions {
  mode: DisplayMode;
}

// ============================================================================
// Truth Table Types
// ============================================================================

export interface TruthTableEntry {
  inputs: Record<string, boolean>;  // Variable name -> value
  result: boolean;
}

export interface TruthTable {
  formula: Formula;
  variables: string[];
  rows: TruthTableEntry[];
  isTautology: boolean;
  isContradiction: boolean;
  isSatisfiable: boolean;
}
