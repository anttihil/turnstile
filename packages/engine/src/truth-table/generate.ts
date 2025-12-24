import type { Formula, TruthTable, TruthTableEntry } from '../types.js';
import { extractVariables } from '../parser/parser.js';
import { evaluate, isTautology, isContradiction, isSatisfiable, generateAllAssignments } from './evaluate.js';

/**
 * Generate a complete truth table for a formula.
 */
export function generateTruthTable(formula: Formula): TruthTable {
  const variables = extractVariables(formula);
  const rows: TruthTableEntry[] = [];

  for (const assignments of generateAllAssignments(variables)) {
    rows.push({
      inputs: { ...assignments },
      result: evaluate(formula, assignments),
    });
  }

  return {
    formula,
    variables,
    rows,
    isTautology: isTautology(formula, variables),
    isContradiction: isContradiction(formula, variables),
    isSatisfiable: isSatisfiable(formula, variables),
  };
}

/**
 * Check if two formulas are logically equivalent (same truth table).
 */
export function areEquivalent(a: Formula, b: Formula): boolean {
  const varsA = extractVariables(a);
  const varsB = extractVariables(b);
  const allVars = [...new Set([...varsA, ...varsB])].sort();

  for (const assignments of generateAllAssignments(allVars)) {
    if (evaluate(a, assignments) !== evaluate(b, assignments)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a set of formulas is satisfiable (all can be true simultaneously).
 */
export function areJointlySatisfiable(formulas: Formula[]): boolean {
  if (formulas.length === 0) return true;

  const allVars = [...new Set(formulas.flatMap(extractVariables))].sort();

  for (const assignments of generateAllAssignments(allVars)) {
    const allTrue = formulas.every((f) => evaluate(f, assignments));
    if (allTrue) return true;
  }

  return false;
}

/**
 * Check if a conclusion follows from premises (semantic entailment).
 * premises ⊨ conclusion iff no assignment makes all premises true and conclusion false.
 */
export function entails(premises: Formula[], conclusion: Formula): boolean {
  const allVars = [
    ...new Set([...premises.flatMap(extractVariables), ...extractVariables(conclusion)]),
  ].sort();

  for (const assignments of generateAllAssignments(allVars)) {
    const premisesTrue = premises.every((p) => evaluate(p, assignments));
    if (premisesTrue && !evaluate(conclusion, assignments)) {
      return false;
    }
  }

  return true;
}

/**
 * Find a counterexample where premises are true but conclusion is false.
 * Returns null if the argument is valid.
 */
export function findCounterexample(
  premises: Formula[],
  conclusion: Formula
): Record<string, boolean> | null {
  const allVars = [
    ...new Set([...premises.flatMap(extractVariables), ...extractVariables(conclusion)]),
  ].sort();

  for (const assignments of generateAllAssignments(allVars)) {
    const premisesTrue = premises.every((p) => evaluate(p, assignments));
    if (premisesTrue && !evaluate(conclusion, assignments)) {
      return { ...assignments };
    }
  }

  return null;
}

/**
 * Validate a student's truth table submission against the correct answer.
 */
export function validateTruthTableSubmission(
  formula: Formula,
  submittedRows: { inputs: boolean[]; output: boolean }[],
  variableOrder: string[]
): { correct: boolean; errors: { row: number; expected: boolean }[] } {
  const errors: { row: number; expected: boolean }[] = [];

  for (let i = 0; i < submittedRows.length; i++) {
    const submitted = submittedRows[i]!;
    const assignments: Record<string, boolean> = {};

    for (let j = 0; j < variableOrder.length; j++) {
      assignments[variableOrder[j]!] = submitted.inputs[j]!;
    }

    const expected = evaluate(formula, assignments);
    if (submitted.output !== expected) {
      errors.push({ row: i, expected });
    }
  }

  return {
    correct: errors.length === 0,
    errors,
  };
}
