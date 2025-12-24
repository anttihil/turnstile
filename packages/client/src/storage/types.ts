import type {
  Problem,
  Submission,
  SubmissionExport,
  Feedback,
  TruthTableProblem,
  TruthTableSubmission,
  UserProgress,
  ProvenTheorem,
} from '@turnstile/engine';

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  status: 'offline' | 'synced' | 'error';
  message?: string;
  syncedAt?: string;
}

/**
 * Port interface for storage operations.
 * The app depends on this abstraction, allowing different implementations
 * (IndexedDB, server sync, etc.)
 */
export interface StoragePort {
  // Problems
  getProblems(): Promise<Problem[]>;
  getProblem(id: string): Promise<Problem | null>;
  saveProblems(problems: Problem[]): Promise<void>;

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
  getTruthTableProblem(id: string): Promise<TruthTableProblem | null>;
  saveTruthTableProblems(problems: TruthTableProblem[]): Promise<void>;
  saveTruthTableSubmission(sub: TruthTableSubmission): Promise<void>;
  getTruthTableSubmission(problemId: string): Promise<TruthTableSubmission | null>;

  // User progress (prove-to-use)
  getProgress(): Promise<UserProgress>;
  saveProgress(progress: UserProgress): Promise<void>;
  unlockRule(ruleId: string): Promise<void>;
  addTheorem(theorem: ProvenTheorem): Promise<void>;

  // Sync (no-op for local adapter)
  sync(): Promise<SyncResult>;

  // Initialization
  initialize(): Promise<void>;
  isInitialized(): boolean;
}

/**
 * Database schema version for migrations.
 */
export const DB_SCHEMA_VERSION = 1;

/**
 * Database name.
 */
export const DB_NAME = 'turnstile-db';

/**
 * Object store names.
 */
export const STORES = {
  problems: 'problems',
  submissions: 'submissions',
  truthTableProblems: 'truthTableProblems',
  truthTableSubmissions: 'truthTableSubmissions',
  progress: 'progress',
  feedback: 'feedback',
} as const;

/**
 * Client version for submissions.
 */
export const CLIENT_VERSION = '0.1.0';
