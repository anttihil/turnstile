import type { Formula, ProofStep, ValidationError } from '../types.js';
import { formulaEquals } from '../parser/parser.js';
import { getRequiredJustificationCount } from './rules.js';

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
  premises: Formula[];
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
 */
function validateRuleApplication(
  step: ProofStep,
  context: ValidationContext
): ValidationError[] {
  const getFormula = (justId: string): Formula | undefined => {
    return context.lines.find((l) => l.step.id === justId)?.step.formula;
  };

  const getLineInfo = (justId: string): ProofLineInfo | undefined => {
    return context.lines.find((l) => l.step.id === justId);
  };

  switch (step.rule) {
    case 'assumption': {
      // Assumption opens a subproof - no validation needed for the formula itself
      // The depth should have increased
      return [];
    }

    case 'and_intro': {
      const [leftId, rightId] = step.justification;
      const left = getFormula(leftId!);
      const right = getFormula(rightId!);

      if (!left || !right) {
        return [{ stepId: step.id, message: 'Missing justification formula', code: 'INVALID_JUSTIFICATION' }];
      }

      if (step.formula.kind !== 'and') {
        return [{
          stepId: step.id,
          message: 'Conjunction introduction must produce a conjunction (∧)',
          code: 'WRONG_CONCLUSION_TYPE',
        }];
      }

      if (!formulaEquals(step.formula.left, left) || !formulaEquals(step.formula.right, right)) {
        return [{
          stepId: step.id,
          message: 'Conjunction does not match the justified formulas',
          code: 'CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'and_elim_l': {
      const conjunction = getFormula(step.justification[0]!);
      if (!conjunction || conjunction.kind !== 'and') {
        return [{
          stepId: step.id,
          message: 'Conjunction elimination requires a conjunction (∧)',
          code: 'WRONG_PREMISE_TYPE',
        }];
      }

      if (!formulaEquals(step.formula, conjunction.left)) {
        return [{
          stepId: step.id,
          message: 'Result must be the left conjunct',
          code: 'CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'and_elim_r': {
      const conjunction = getFormula(step.justification[0]!);
      if (!conjunction || conjunction.kind !== 'and') {
        return [{
          stepId: step.id,
          message: 'Conjunction elimination requires a conjunction (∧)',
          code: 'WRONG_PREMISE_TYPE',
        }];
      }

      if (!formulaEquals(step.formula, conjunction.right)) {
        return [{
          stepId: step.id,
          message: 'Result must be the right conjunct',
          code: 'CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'or_intro_l': {
      const operand = getFormula(step.justification[0]!);
      if (!operand) {
        return [{ stepId: step.id, message: 'Missing justification formula', code: 'INVALID_JUSTIFICATION' }];
      }

      if (step.formula.kind !== 'or') {
        return [{
          stepId: step.id,
          message: 'Disjunction introduction must produce a disjunction (∨)',
          code: 'WRONG_CONCLUSION_TYPE',
        }];
      }

      if (!formulaEquals(step.formula.left, operand)) {
        return [{
          stepId: step.id,
          message: 'The justified formula must appear as the left disjunct',
          code: 'CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'or_intro_r': {
      const operand = getFormula(step.justification[0]!);
      if (!operand) {
        return [{ stepId: step.id, message: 'Missing justification formula', code: 'INVALID_JUSTIFICATION' }];
      }

      if (step.formula.kind !== 'or') {
        return [{
          stepId: step.id,
          message: 'Disjunction introduction must produce a disjunction (∨)',
          code: 'WRONG_CONCLUSION_TYPE',
        }];
      }

      if (!formulaEquals(step.formula.right, operand)) {
        return [{
          stepId: step.id,
          message: 'The justified formula must appear as the right disjunct',
          code: 'CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'or_elim': {
      // Need: A ∨ B, subproof(A→C), subproof(B→C) to get C
      const [disjId, subproof1Id, subproof2Id] = step.justification;
      const disjunction = getFormula(disjId!);
      const sub1 = getLineInfo(subproof1Id!);
      const sub2 = getLineInfo(subproof2Id!);

      if (!disjunction || disjunction.kind !== 'or') {
        return [{
          stepId: step.id,
          message: 'First justification must be a disjunction (∨)',
          code: 'WRONG_PREMISE_TYPE',
        }];
      }

      if (!sub1 || !sub2) {
        return [{ stepId: step.id, message: 'Missing subproof justification', code: 'INVALID_JUSTIFICATION' }];
      }

      // sub1 should be a subproof with assumption matching left disjunct
      if (!sub1.isSubproofStart || sub1.subproofEnd === undefined) {
        return [{
          stepId: step.id,
          message: 'Second justification must be a complete subproof',
          code: 'INVALID_SUBPROOF',
        }];
      }

      // Check assumption matches left disjunct
      if (!formulaEquals(sub1.step.formula, disjunction.left)) {
        return [{
          stepId: step.id,
          message: 'First subproof assumption must match the left disjunct',
          code: 'SUBPROOF_MISMATCH',
        }];
      }

      // Check first subproof conclusion matches our conclusion
      const sub1End = context.lines[sub1.subproofEnd];
      if (!sub1End || !formulaEquals(sub1End.step.formula, step.formula)) {
        return [{
          stepId: step.id,
          message: 'First subproof must conclude with the target formula',
          code: 'SUBPROOF_CONCLUSION_MISMATCH',
        }];
      }

      // Same checks for second subproof
      if (!sub2.isSubproofStart || sub2.subproofEnd === undefined) {
        return [{
          stepId: step.id,
          message: 'Third justification must be a complete subproof',
          code: 'INVALID_SUBPROOF',
        }];
      }

      if (!formulaEquals(sub2.step.formula, disjunction.right)) {
        return [{
          stepId: step.id,
          message: 'Second subproof assumption must match the right disjunct',
          code: 'SUBPROOF_MISMATCH',
        }];
      }

      const sub2End = context.lines[sub2.subproofEnd];
      if (!sub2End || !formulaEquals(sub2End.step.formula, step.formula)) {
        return [{
          stepId: step.id,
          message: 'Second subproof must conclude with the target formula',
          code: 'SUBPROOF_CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'implies_intro': {
      // Need subproof(A→B) to get A → B
      const subproofStart = getLineInfo(step.justification[0]!);

      if (!subproofStart || !subproofStart.isSubproofStart || subproofStart.subproofEnd === undefined) {
        return [{
          stepId: step.id,
          message: 'Conditional introduction requires a complete subproof',
          code: 'INVALID_SUBPROOF',
        }];
      }

      if (step.formula.kind !== 'implies') {
        return [{
          stepId: step.id,
          message: 'Conditional introduction must produce a conditional (→)',
          code: 'WRONG_CONCLUSION_TYPE',
        }];
      }

      // Check assumption matches antecedent
      if (!formulaEquals(subproofStart.step.formula, step.formula.left)) {
        return [{
          stepId: step.id,
          message: 'Subproof assumption must match the antecedent',
          code: 'SUBPROOF_MISMATCH',
        }];
      }

      // Check subproof conclusion matches consequent
      const subproofEnd = context.lines[subproofStart.subproofEnd];
      if (!subproofEnd || !formulaEquals(subproofEnd.step.formula, step.formula.right)) {
        return [{
          stepId: step.id,
          message: 'Subproof conclusion must match the consequent',
          code: 'SUBPROOF_CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'implies_elim': {
      // Need A → B and A to get B
      const [condId, antecedentId] = step.justification;
      const conditional = getFormula(condId!);
      const antecedent = getFormula(antecedentId!);

      if (!conditional || conditional.kind !== 'implies') {
        // Try swapping order
        const maybeConditional = getFormula(antecedentId!);
        const maybeAntecedent = getFormula(condId!);

        if (maybeConditional?.kind === 'implies') {
          if (formulaEquals(maybeConditional.left, maybeAntecedent!) &&
              formulaEquals(maybeConditional.right, step.formula)) {
            return [];
          }
        }

        return [{
          stepId: step.id,
          message: 'Conditional elimination requires a conditional (→)',
          code: 'WRONG_PREMISE_TYPE',
        }];
      }

      if (!antecedent) {
        return [{ stepId: step.id, message: 'Missing antecedent', code: 'INVALID_JUSTIFICATION' }];
      }

      if (!formulaEquals(conditional.left, antecedent)) {
        return [{
          stepId: step.id,
          message: 'Antecedent must match the conditional\'s antecedent',
          code: 'CONCLUSION_MISMATCH',
        }];
      }

      if (!formulaEquals(conditional.right, step.formula)) {
        return [{
          stepId: step.id,
          message: 'Result must be the conditional\'s consequent',
          code: 'CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'not_intro': {
      // Need subproof(A→⊥) to get ¬A
      const subproofStart = getLineInfo(step.justification[0]!);

      if (!subproofStart || !subproofStart.isSubproofStart || subproofStart.subproofEnd === undefined) {
        return [{
          stepId: step.id,
          message: 'Negation introduction requires a complete subproof',
          code: 'INVALID_SUBPROOF',
        }];
      }

      if (step.formula.kind !== 'not') {
        return [{
          stepId: step.id,
          message: 'Negation introduction must produce a negation (¬)',
          code: 'WRONG_CONCLUSION_TYPE',
        }];
      }

      // Check assumption matches operand
      if (!formulaEquals(subproofStart.step.formula, step.formula.operand)) {
        return [{
          stepId: step.id,
          message: 'Subproof assumption must match the negation operand',
          code: 'SUBPROOF_MISMATCH',
        }];
      }

      // Check subproof ends with bottom
      const subproofEnd = context.lines[subproofStart.subproofEnd];
      if (!subproofEnd || subproofEnd.step.formula.kind !== 'bottom') {
        return [{
          stepId: step.id,
          message: 'Subproof must end with ⊥',
          code: 'SUBPROOF_CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'not_elim': {
      // Need ¬¬A to get A
      const doubleNeg = getFormula(step.justification[0]!);

      if (!doubleNeg || doubleNeg.kind !== 'not' || doubleNeg.operand.kind !== 'not') {
        return [{
          stepId: step.id,
          message: 'Double negation elimination requires ¬¬A',
          code: 'WRONG_PREMISE_TYPE',
        }];
      }

      if (!formulaEquals(doubleNeg.operand.operand, step.formula)) {
        return [{
          stepId: step.id,
          message: 'Result must be the doubly-negated formula',
          code: 'CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'iff_intro': {
      // Need A → B and B → A to get A ↔ B
      const [impl1Id, impl2Id] = step.justification;
      const impl1 = getFormula(impl1Id!);
      const impl2 = getFormula(impl2Id!);

      if (!impl1 || impl1.kind !== 'implies' || !impl2 || impl2.kind !== 'implies') {
        return [{
          stepId: step.id,
          message: 'Biconditional introduction requires two conditionals',
          code: 'WRONG_PREMISE_TYPE',
        }];
      }

      if (step.formula.kind !== 'iff') {
        return [{
          stepId: step.id,
          message: 'Biconditional introduction must produce a biconditional (↔)',
          code: 'WRONG_CONCLUSION_TYPE',
        }];
      }

      // Check A → B and B → A
      const valid1 = formulaEquals(impl1.left, step.formula.left) &&
                     formulaEquals(impl1.right, step.formula.right) &&
                     formulaEquals(impl2.left, step.formula.right) &&
                     formulaEquals(impl2.right, step.formula.left);

      const valid2 = formulaEquals(impl2.left, step.formula.left) &&
                     formulaEquals(impl2.right, step.formula.right) &&
                     formulaEquals(impl1.left, step.formula.right) &&
                     formulaEquals(impl1.right, step.formula.left);

      if (!valid1 && !valid2) {
        return [{
          stepId: step.id,
          message: 'Conditionals must be A → B and B → A',
          code: 'CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'iff_elim': {
      // Need A ↔ B and A to get B (or A ↔ B and B to get A)
      const [biffId, operandId] = step.justification;
      const biconditional = getFormula(biffId!);
      const operand = getFormula(operandId!);

      if (!biconditional || biconditional.kind !== 'iff') {
        // Try swapped
        const maybeBiff = getFormula(operandId!);
        if (maybeBiff?.kind === 'iff') {
          const maybeOp = getFormula(biffId!);
          if (maybeOp &&
              ((formulaEquals(maybeBiff.left, maybeOp) && formulaEquals(maybeBiff.right, step.formula)) ||
               (formulaEquals(maybeBiff.right, maybeOp) && formulaEquals(maybeBiff.left, step.formula)))) {
            return [];
          }
        }
        return [{
          stepId: step.id,
          message: 'Biconditional elimination requires a biconditional (↔)',
          code: 'WRONG_PREMISE_TYPE',
        }];
      }

      if (!operand) {
        return [{ stepId: step.id, message: 'Missing operand', code: 'INVALID_JUSTIFICATION' }];
      }

      // Check: if operand = left, result should be right; if operand = right, result should be left
      if (formulaEquals(biconditional.left, operand) && formulaEquals(biconditional.right, step.formula)) {
        return [];
      }
      if (formulaEquals(biconditional.right, operand) && formulaEquals(biconditional.left, step.formula)) {
        return [];
      }

      return [{
        stepId: step.id,
        message: 'Result must be the other side of the biconditional',
        code: 'CONCLUSION_MISMATCH',
      }];
    }

    case 'bottom_elim': {
      // Need ⊥ to get any formula
      const bottom = getFormula(step.justification[0]!);

      if (!bottom || bottom.kind !== 'bottom') {
        return [{
          stepId: step.id,
          message: 'Falsum elimination requires ⊥',
          code: 'WRONG_PREMISE_TYPE',
        }];
      }

      // Any formula is valid
      return [];
    }

    case 'raa': {
      // Need subproof(¬A→⊥) to get A
      const subproofStart = getLineInfo(step.justification[0]!);

      if (!subproofStart || !subproofStart.isSubproofStart || subproofStart.subproofEnd === undefined) {
        return [{
          stepId: step.id,
          message: 'RAA requires a complete subproof',
          code: 'INVALID_SUBPROOF',
        }];
      }

      // Check assumption is ¬(conclusion)
      const assumption = subproofStart.step.formula;
      if (assumption.kind !== 'not' || !formulaEquals(assumption.operand, step.formula)) {
        return [{
          stepId: step.id,
          message: 'Subproof assumption must be the negation of the conclusion',
          code: 'SUBPROOF_MISMATCH',
        }];
      }

      // Check subproof ends with bottom
      const subproofEnd = context.lines[subproofStart.subproofEnd];
      if (!subproofEnd || subproofEnd.step.formula.kind !== 'bottom') {
        return [{
          stepId: step.id,
          message: 'Subproof must end with ⊥',
          code: 'SUBPROOF_CONCLUSION_MISMATCH',
        }];
      }

      return [];
    }

    case 'theorem': {
      // Citing a proven theorem - needs theoremId
      if (!step.theoremId) {
        return [{
          stepId: step.id,
          message: 'Theorem citation requires a theorem ID',
          code: 'MISSING_THEOREM_ID',
        }];
      }
      // The actual theorem verification should be done at a higher level with access to theorem library
      return [];
    }

    default:
      return [{
        stepId: step.id,
        message: `Unknown rule: ${step.rule}`,
        code: 'UNKNOWN_RULE',
      }];
  }
}
