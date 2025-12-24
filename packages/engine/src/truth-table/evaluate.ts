import type { Formula } from '../types.js';

/**
 * Evaluate a formula given variable assignments.
 *
 * @param formula - The formula to evaluate
 * @param assignments - Map of variable names to boolean values
 * @returns The truth value of the formula
 * @throws Error if a variable is not in the assignments
 */
export function evaluate(
  formula: Formula,
  assignments: Record<string, boolean>
): boolean {
  switch (formula.kind) {
    case 'var': {
      const value = assignments[formula.name];
      if (value === undefined) {
        throw new Error(`Variable '${formula.name}' not found in assignments`);
      }
      return value;
    }

    case 'bottom':
      return false;

    case 'not':
      return !evaluate(formula.operand, assignments);

    case 'and':
      return evaluate(formula.left, assignments) && evaluate(formula.right, assignments);

    case 'or':
      return evaluate(formula.left, assignments) || evaluate(formula.right, assignments);

    case 'implies':
      return !evaluate(formula.left, assignments) || evaluate(formula.right, assignments);

    case 'iff': {
      const left = evaluate(formula.left, assignments);
      const right = evaluate(formula.right, assignments);
      return left === right;
    }
  }
}

/**
 * Check if a formula is a tautology (always true).
 */
export function isTautology(formula: Formula, variables: string[]): boolean {
  for (const assignments of generateAllAssignments(variables)) {
    if (!evaluate(formula, assignments)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a formula is a contradiction (always false).
 */
export function isContradiction(formula: Formula, variables: string[]): boolean {
  for (const assignments of generateAllAssignments(variables)) {
    if (evaluate(formula, assignments)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a formula is satisfiable (true for at least one assignment).
 */
export function isSatisfiable(formula: Formula, variables: string[]): boolean {
  for (const assignments of generateAllAssignments(variables)) {
    if (evaluate(formula, assignments)) {
      return true;
    }
  }
  return false;
}

/**
 * Generate all possible variable assignments.
 * Order: T,T then T,F then F,T then F,F (standard truth table order)
 */
export function* generateAllAssignments(
  variables: string[]
): Generator<Record<string, boolean>> {
  const n = variables.length;
  const total = 1 << n; // 2^n combinations

  for (let i = 0; i < total; i++) {
    const assignments: Record<string, boolean> = {};
    for (let j = 0; j < n; j++) {
      // Invert bits so i=0 gives all true, i=total-1 gives all false
      assignments[variables[j]!] = !(i & (1 << (n - 1 - j)));
    }
    yield assignments;
  }
}
