import { parse } from '@turnstile/engine';
import type { Problem, TruthTableProblem, RuleDefinition } from '@turnstile/engine';
import type { StoragePort } from '../storage/types';

import problemsData from './problems.json';
import truthTableData from './truth-table-problems.json';
import rulesData from './rules.json';

/**
 * Raw problem data from JSON (formulas as strings).
 */
interface RawProblem {
  id: string;
  type: 'exercise' | 'derivation';
  premises: string[];
  conclusion: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hint?: string;
  tags?: string[];
  unlocksRule?: string;
  requiredRules?: string[];
}

/**
 * Raw truth table problem from JSON.
 */
interface RawTruthTableProblem {
  id: string;
  formula: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hint?: string;
  tags?: string[];
}

/**
 * Parse a raw problem into a Problem object.
 */
function parseProblem(raw: RawProblem): Problem {
  return {
    id: raw.id,
    type: raw.type,
    premises: raw.premises.map((p) => parse(p)),
    conclusion: parse(raw.conclusion),
    difficulty: raw.difficulty,
    hint: raw.hint,
    tags: raw.tags,
    unlocksRule: raw.unlocksRule,
    requiredRules: raw.requiredRules,
    schemaVersion: 1,
  };
}

/**
 * Parse a raw truth table problem.
 */
function parseTruthTableProblem(raw: RawTruthTableProblem): TruthTableProblem {
  return {
    id: raw.id,
    formula: parse(raw.formula),
    difficulty: raw.difficulty,
    hint: raw.hint,
    tags: raw.tags,
    schemaVersion: 1,
  };
}

/**
 * Get all bundled problems.
 */
export function getBundledProblems(): Problem[] {
  return (problemsData.problems as RawProblem[]).map(parseProblem);
}

/**
 * Get all bundled truth table problems.
 */
export function getBundledTruthTableProblems(): TruthTableProblem[] {
  return (truthTableData.problems as RawTruthTableProblem[]).map(parseTruthTableProblem);
}

/**
 * Get all rule definitions.
 */
export function getRuleDefinitions(): RuleDefinition[] {
  return rulesData.rules as RuleDefinition[];
}

/**
 * Check if the database needs to be seeded with initial data.
 */
async function needsSeeding(storage: StoragePort): Promise<boolean> {
  const problems = await storage.getProblems();
  return problems.length === 0;
}

/**
 * Seed the database with bundled problem data.
 * Only runs on first launch when IndexedDB is empty.
 */
export async function seedDatabase(storage: StoragePort): Promise<void> {
  const needs = await needsSeeding(storage);

  if (!needs) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database with bundled problems...');

  // Load problems
  const problems = getBundledProblems();
  await storage.saveProblems(problems);

  // Load truth table problems
  const ttProblems = getBundledTruthTableProblems();
  await storage.saveTruthTableProblems(ttProblems);

  console.log(`Seeded ${problems.length} problems and ${ttProblems.length} truth table problems`);
}

/**
 * Get a problem by ID from bundled data (for reference without DB).
 */
export function getBundledProblem(id: string): Problem | undefined {
  return getBundledProblems().find((p) => p.id === id);
}

/**
 * Get a truth table problem by ID from bundled data.
 */
export function getBundledTruthTableProblem(id: string): TruthTableProblem | undefined {
  return getBundledTruthTableProblems().find((p) => p.id === id);
}
