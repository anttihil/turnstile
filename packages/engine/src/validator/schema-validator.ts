import type { Formula, ProofStep, ValidationError } from '../types.js';
import type { ProofLineInfo, ValidationContext } from './validator.js';
import type { RuleSchema, PremisePattern } from './schemas.js';
import type { Substitution } from './patterns.js';
import { matchPattern } from './patterns.js';
import { SCHEMAS_BY_RULE } from './schemas.js';

// ============================================================================
// Justification Resolution
// ============================================================================

/**
 * A resolved justification carries the line's formula, plus optional subproof
 * info if the line is a subproof start. The premise pattern decides which to use.
 */
interface ResolvedJustification {
  formula: Formula;
  subproof?: { assumption: Formula; conclusion: Formula };
}

function resolveJustification(
  justId: string,
  context: ValidationContext,
): ResolvedJustification | null {
  const info = context.lines.find((l) => l.step.id === justId);
  if (!info) return null;

  const result: ResolvedJustification = { formula: info.step.formula };

  if (info.isSubproofStart && info.subproofEnd !== undefined) {
    const endLine = context.lines[info.subproofEnd];
    if (endLine) {
      result.subproof = {
        assumption: info.step.formula,
        conclusion: endLine.step.formula,
      };
    }
  }

  return result;
}

// ============================================================================
// Permutation Helpers
// ============================================================================

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i]!, ...perm]);
    }
  }
  return result;
}

// ============================================================================
// Schema Matching
// ============================================================================

/**
 * Try to match resolved justifications against premise patterns in the given order,
 * then match the conclusion. Returns null on success, or an error descriptor on failure.
 */
function tryMatch(
  schema: RuleSchema,
  resolved: ResolvedJustification[],
  conclusionFormula: Formula,
): { success: true } | { success: false; failurePoint: FailurePoint } {
  const subst: Substitution = new Map();

  for (let i = 0; i < schema.premises.length; i++) {
    const premise = schema.premises[i]!;
    const just = resolved[i]!;

    const result = matchPremise(premise, just, subst);
    if (result !== null) {
      return { success: false, failurePoint: result };
    }
  }

  // Match conclusion
  const conclusionResult = matchPattern(schema.conclusion, conclusionFormula, subst);
  if (!conclusionResult) {
    return { success: false, failurePoint: 'conclusion' };
  }

  return { success: true };
}

type FailurePoint =
  | 'premise_kind_mismatch'
  | 'invalid_subproof'
  | 'subproof_assumption'
  | 'subproof_conclusion'
  | 'premise_formula'
  | 'conclusion';

/**
 * Match a single justification against a premise pattern, threading the substitution.
 * Returns null on success, or a failure descriptor.
 */
function matchPremise(
  premise: PremisePattern,
  just: ResolvedJustification,
  subst: Substitution,
): FailurePoint | null {
  if (premise.type === 'line') {
    // Line premise: match against the justification's formula
    const result = matchPattern(premise.pattern, just.formula, subst);
    return result ? null : 'premise_formula';
  }

  // premise.type === 'subproof'
  if (!just.subproof) {
    return 'invalid_subproof';
  }

  const afterAssumption = matchPattern(premise.assumption, just.subproof.assumption, subst);
  if (!afterAssumption) return 'subproof_assumption';

  const afterConclusion = matchPattern(premise.conclusion, just.subproof.conclusion, afterAssumption);
  if (!afterConclusion) return 'subproof_conclusion';

  return null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Validate a rule application using declarative schemas.
 * Returns empty array on success, or an array of validation errors.
 *
 * Rules handled explicitly outside this function: 'assumption', 'theorem'.
 */
export function validateBySchema(
  step: ProofStep,
  context: ValidationContext,
): ValidationError[] | null {
  const schemas = SCHEMAS_BY_RULE.get(step.rule);
  if (!schemas) return null; // not a schema-based rule

  // Resolve all justifications
  const resolved: ResolvedJustification[] = [];
  for (const justId of step.justification) {
    const r = resolveJustification(justId, context);
    if (!r) {
      return [{
        stepId: step.id,
        message: 'Missing justification formula',
        code: 'INVALID_JUSTIFICATION',
      }];
    }
    resolved.push(r);
  }

  // Track the best failure for error reporting
  let bestFailure: FailurePoint | null = null;

  for (const schema of schemas) {
    const orderings = schema.orderFlexible
      ? permutations(resolved)
      : [resolved];

    for (const ordering of orderings) {
      const result = tryMatch(schema, ordering, step.formula);
      if (result.success) return [];
      // Keep track of how far we got (later failures are "closer" to success)
      bestFailure = result.failurePoint;
    }
  }

  // Map failure point to error code and message
  return [mapFailureToError(step, bestFailure!)];
}

function mapFailureToError(
  step: ProofStep,
  failure: FailurePoint,
): ValidationError {
  switch (failure) {
    case 'premise_kind_mismatch':
    case 'premise_formula':
      return {
        stepId: step.id,
        message: `Premise does not match the expected pattern for ${step.rule}`,
        code: 'WRONG_PREMISE_TYPE',
      };
    case 'invalid_subproof':
      return {
        stepId: step.id,
        message: `${step.rule} requires a complete subproof`,
        code: 'INVALID_SUBPROOF',
      };
    case 'subproof_assumption':
      return {
        stepId: step.id,
        message: 'Subproof assumption does not match the expected pattern',
        code: 'SUBPROOF_MISMATCH',
      };
    case 'subproof_conclusion':
      return {
        stepId: step.id,
        message: 'Subproof conclusion does not match the expected pattern',
        code: 'SUBPROOF_CONCLUSION_MISMATCH',
      };
    case 'conclusion':
      return {
        stepId: step.id,
        message: 'Conclusion does not match the expected result',
        code: 'CONCLUSION_MISMATCH',
      };
  }
}
