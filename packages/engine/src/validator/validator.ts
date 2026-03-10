import type { ProofStep, ValidationError } from '../types.js';
import { getRequiredJustificationCount } from './rules.js';
import { validateBySchema } from './schema-validator.js';

/**
 * Information about a proof line for validation purposes.
 */
export interface ProofLineInfo {
  step: ProofStep;
  index: number;
  accessible: boolean;        // Can this line be cited from current position?
  isSubproofStart: boolean;   // Is this an assumption that starts a subproof?
  isSubproofEnd: boolean;     // Is this the last line of a closed subproof?
  subproofStart?: number;     // Index of assumption if this is a subproof
  subproofEnd?: number;       // Index of last line if this is a subproof
}

/**
 * Context for validating a proof step.
 */
export interface ValidationContext {
  lines: ProofLineInfo[];
  currentIndex: number;
  currentDepth: number;
}

/**
 * Validate a single proof step.
 */
export function validateStep(
  step: ProofStep,
  context: ValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check justification count
  const [minJust, maxJust] = getRequiredJustificationCount(step.rule);
  if (step.justification.length < minJust) {
    errors.push({
      stepId: step.id,
      message: `${step.rule} requires at least ${minJust} justification(s), got ${step.justification.length}`,
      code: 'INSUFFICIENT_JUSTIFICATIONS',
    });
    return errors;
  }
  if (step.justification.length > maxJust) {
    errors.push({
      stepId: step.id,
      message: `${step.rule} requires at most ${maxJust} justification(s), got ${step.justification.length}`,
      code: 'TOO_MANY_JUSTIFICATIONS',
    });
    return errors;
  }

  // Check all justifications are accessible
  for (const justId of step.justification) {
    const justLine = context.lines.find((l) => l.step.id === justId);
    if (!justLine) {
      errors.push({
        stepId: step.id,
        message: `Justification ${justId} not found`,
        code: 'JUSTIFICATION_NOT_FOUND',
      });
      continue;
    }
    if (!justLine.accessible) {
      errors.push({
        stepId: step.id,
        message: `Line ${justLine.index + 1} is not accessible (inside closed subproof)`,
        code: 'INACCESSIBLE_JUSTIFICATION',
      });
    }
  }

  if (errors.length > 0) return errors;

  // Validate rule-specific logic
  const ruleErrors = validateRuleApplication(step, context);
  errors.push(...ruleErrors);

  return errors;
}

/**
 * Validate rule-specific logic.
 * Delegates to the schema-based validator for all standard rules.
 * Only 'assumption' and 'theorem' are handled explicitly.
 */
function validateRuleApplication(
  step: ProofStep,
  context: ValidationContext
): ValidationError[] {
  // Handle non-schema rules explicitly
  switch (step.rule) {
    case 'assumption':
      return [];

    case 'theorem': {
      if (!step.theoremId) {
        return [{
          stepId: step.id,
          message: 'Theorem citation requires a theorem ID',
          code: 'MISSING_THEOREM_ID',
        }];
      }
      return [];
    }
  }

  // Delegate to schema-based validator
  const schemaResult = validateBySchema(step, context);
  if (schemaResult !== null) return schemaResult;

  return [{
    stepId: step.id,
    message: `Unknown rule: ${step.rule}`,
    code: 'UNKNOWN_RULE',
  }];
}
