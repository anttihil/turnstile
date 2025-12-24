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
import type { StoragePort, SyncResult } from './types';
import { DB_NAME, DB_SCHEMA_VERSION, STORES, CLIENT_VERSION } from './types';

/**
 * IndexedDB implementation of the StoragePort interface.
 * Provides offline-first storage with all data stored locally.
 */
export class IndexedDBAdapter implements StoragePort {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database connection.
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_SCHEMA_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });

    return this.initPromise;
  }

  /**
   * Create object stores for the database.
   */
  private createStores(db: IDBDatabase): void {
    // Problems store
    if (!db.objectStoreNames.contains(STORES.problems)) {
      const store = db.createObjectStore(STORES.problems, { keyPath: 'id' });
      store.createIndex('difficulty', 'difficulty', { unique: false });
      store.createIndex('type', 'type', { unique: false });
    }

    // Submissions store
    if (!db.objectStoreNames.contains(STORES.submissions)) {
      const store = db.createObjectStore(STORES.submissions, { keyPath: 'id' });
      store.createIndex('problemId', 'problemId', { unique: false });
      store.createIndex('status', 'status', { unique: false });
    }

    // Truth table problems store
    if (!db.objectStoreNames.contains(STORES.truthTableProblems)) {
      const store = db.createObjectStore(STORES.truthTableProblems, { keyPath: 'id' });
      store.createIndex('difficulty', 'difficulty', { unique: false });
    }

    // Truth table submissions store
    if (!db.objectStoreNames.contains(STORES.truthTableSubmissions)) {
      const store = db.createObjectStore(STORES.truthTableSubmissions, { keyPath: 'id' });
      store.createIndex('problemId', 'problemId', { unique: false });
    }

    // Progress store (single record with id 'current')
    if (!db.objectStoreNames.contains(STORES.progress)) {
      db.createObjectStore(STORES.progress, { keyPath: 'id' });
    }

    // Feedback store
    if (!db.objectStoreNames.contains(STORES.feedback)) {
      const store = db.createObjectStore(STORES.feedback, { keyPath: 'id' });
      store.createIndex('submissionId', 'submissionId', { unique: false });
    }
  }

  isInitialized(): boolean {
    return this.db !== null;
  }

  private ensureDb(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // ============================================================================
  // Problems
  // ============================================================================

  async getProblems(): Promise<Problem[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.problems, 'readonly');
      const store = tx.objectStore(STORES.problems);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get problems'));
    });
  }

  async getProblem(id: string): Promise<Problem | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.problems, 'readonly');
      const store = tx.objectStore(STORES.problems);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(new Error('Failed to get problem'));
    });
  }

  async saveProblems(problems: Problem[]): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.problems, 'readwrite');
      const store = tx.objectStore(STORES.problems);

      for (const problem of problems) {
        store.put(problem);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to save problems'));
    });
  }

  // ============================================================================
  // Submissions
  // ============================================================================

  async saveSubmission(submission: Submission): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.submissions, 'readwrite');
      const store = tx.objectStore(STORES.submissions);
      store.put(submission);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to save submission'));
    });
  }

  async getSubmission(problemId: string): Promise<Submission | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.submissions, 'readonly');
      const store = tx.objectStore(STORES.submissions);
      const index = store.index('problemId');
      const request = index.getAll(problemId);

      request.onsuccess = () => {
        const submissions = request.result as Submission[];
        // Return the most recent submission for this problem
        if (submissions.length === 0) {
          resolve(null);
        } else {
          const sorted = submissions.sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          );
          resolve(sorted[0]!);
        }
      };
      request.onerror = () => reject(new Error('Failed to get submission'));
    });
  }

  async getAllSubmissions(): Promise<Submission[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.submissions, 'readonly');
      const store = tx.objectStore(STORES.submissions);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get submissions'));
    });
  }

  async exportSubmissions(): Promise<SubmissionExport> {
    const submissions = await this.getAllSubmissions();
    return {
      exportedAt: new Date().toISOString(),
      clientVersion: CLIENT_VERSION,
      submissions,
    };
  }

  // ============================================================================
  // Feedback
  // ============================================================================

  async importFeedback(feedback: Feedback[]): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.feedback, 'readwrite');
      const store = tx.objectStore(STORES.feedback);

      for (const fb of feedback) {
        store.put(fb);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to import feedback'));
    });
  }

  async getFeedback(submissionId: string): Promise<Feedback | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.feedback, 'readonly');
      const store = tx.objectStore(STORES.feedback);
      const index = store.index('submissionId');
      const request = index.get(submissionId);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(new Error('Failed to get feedback'));
    });
  }

  // ============================================================================
  // Truth Tables
  // ============================================================================

  async getTruthTableProblems(): Promise<TruthTableProblem[]> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.truthTableProblems, 'readonly');
      const store = tx.objectStore(STORES.truthTableProblems);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get truth table problems'));
    });
  }

  async getTruthTableProblem(id: string): Promise<TruthTableProblem | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.truthTableProblems, 'readonly');
      const store = tx.objectStore(STORES.truthTableProblems);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(new Error('Failed to get truth table problem'));
    });
  }

  async saveTruthTableProblems(problems: TruthTableProblem[]): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.truthTableProblems, 'readwrite');
      const store = tx.objectStore(STORES.truthTableProblems);

      for (const problem of problems) {
        store.put(problem);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to save truth table problems'));
    });
  }

  async saveTruthTableSubmission(sub: TruthTableSubmission): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.truthTableSubmissions, 'readwrite');
      const store = tx.objectStore(STORES.truthTableSubmissions);
      store.put(sub);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to save truth table submission'));
    });
  }

  async getTruthTableSubmission(problemId: string): Promise<TruthTableSubmission | null> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.truthTableSubmissions, 'readonly');
      const store = tx.objectStore(STORES.truthTableSubmissions);
      const index = store.index('problemId');
      const request = index.getAll(problemId);

      request.onsuccess = () => {
        const submissions = request.result as TruthTableSubmission[];
        if (submissions.length === 0) {
          resolve(null);
        } else {
          const sorted = submissions.sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          );
          resolve(sorted[0]!);
        }
      };
      request.onerror = () => reject(new Error('Failed to get truth table submission'));
    });
  }

  // ============================================================================
  // User Progress
  // ============================================================================

  async getProgress(): Promise<UserProgress> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.progress, 'readonly');
      const store = tx.objectStore(STORES.progress);
      const request = store.get('current');

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Return default progress
          resolve({
            id: 'current',
            unlockedRules: [],
            theoremLibrary: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            schemaVersion: 1,
          });
        }
      };
      request.onerror = () => reject(new Error('Failed to get progress'));
    });
  }

  async saveProgress(progress: UserProgress): Promise<void> {
    const db = this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.progress, 'readwrite');
      const store = tx.objectStore(STORES.progress);
      store.put({ ...progress, id: 'current', updatedAt: new Date().toISOString() });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to save progress'));
    });
  }

  async unlockRule(ruleId: string): Promise<void> {
    const progress = await this.getProgress();
    if (!progress.unlockedRules.includes(ruleId)) {
      progress.unlockedRules.push(ruleId);
      await this.saveProgress(progress);
    }
  }

  async addTheorem(theorem: ProvenTheorem): Promise<void> {
    const progress = await this.getProgress();
    const exists = progress.theoremLibrary.some((t) => t.id === theorem.id);
    if (!exists) {
      progress.theoremLibrary.push(theorem);
      await this.saveProgress(progress);
    }
  }

  // ============================================================================
  // Sync
  // ============================================================================

  async sync(): Promise<SyncResult> {
    // No-op for local adapter - always offline
    return {
      status: 'offline',
      message: 'Using local storage only',
    };
  }
}

/**
 * Create a new IndexedDB adapter instance.
 */
export function createStorageAdapter(): StoragePort {
  return new IndexedDBAdapter();
}
