import type { Formula, ProofStep, ValidationError, ProofCheckResult, ProvenTheorem } from '../types.js';
import { formulaEquals } from '../parser/parser.js';
import type { ProofLineInfo, ValidationContext } from './validator.js';
import { validateStep } from './validator.js';
import { opensSubproof } from './rules.js';

/**
 * Build proof line information including subproof tracking.
 */
export function buildProofLineInfo(steps: ProofStep[]): ProofLineInfo[] {
  const lines: ProofLineInfo[] = [];
  const subproofStack: { startIndex: number; depth: number }[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const prevDepth = i > 0 ? steps[i - 1]!.depth : 0;

    // Determine if this is a subproof start:
    // - It's an assumption AND
    // - Either depth increased OR we're starting a new subproof at the same depth
    const isAssumption = opensSubproof(step.rule);
    const depthIncreased = step.depth > prevDepth;
    const newSubproofAtSameDepth = isAssumption && step.depth > 0 && step.depth === prevDepth;
    const isSubproofStart = isAssumption && (depthIncreased || newSubproofAtSameDepth);

    // Close subproofs when:
    // 1. Depth decreases below the subproof's depth, OR
    // 2. A new subproof starts at the same depth (consecutive subproofs)
    while (subproofStack.length > 0 &&
           (step.depth < subproofStack[subproofStack.length - 1]!.depth ||
            (newSubproofAtSameDepth && step.depth === subproofStack[subproofStack.length - 1]!.depth))) {
      const closed = subproofStack.pop()!;
      const startLine = lines[closed.startIndex]!;
      startLine.subproofEnd = i - 1;

      // Mark all lines in the closed subproof as inaccessible
      for (let j = closed.startIndex; j < i; j++) {
        lines[j]!.accessible = false;
      }
    }

    // Create line info
    const lineInfo: ProofLineInfo = {
      step,
      index: i,
      accessible: true,
      isSubproofStart,
      isSubproofEnd: false,
    };

    if (isSubproofStart) {
      subproofStack.push({ startIndex: i, depth: step.depth });
    }

    lines.push(lineInfo);
  }

  // Close any remaining open subproofs at the end
  while (subproofStack.length > 0) {
    const closed = subproofStack.pop()!;
    const startLine = lines[closed.startIndex]!;
    startLine.subproofEnd = lines.length - 1;

    // Mark the last line of each subproof
    for (let j = closed.startIndex; j < lines.length; j++) {
      lines[j]!.accessible = false;
    }
  }

  // Mark subproof ends
  for (const line of lines) {
    if (line.isSubproofStart && line.subproofEnd !== undefined) {
      lines[line.subproofEnd]!.isSubproofEnd = true;
    }
  }

  return lines;
}

/**
 * Check an entire proof for validity.
 */
export function checkProof(
  steps: ProofStep[],
  premises: Formula[],
  conclusion: Formula,
  theoremLibrary: ProvenTheorem[] = []
): ProofCheckResult {
  if (steps.length === 0) {
    return {
      valid: false,
      complete: false,
      errors: [{ stepId: '', message: 'Proof is empty', code: 'EMPTY_PROOF' }],
    };
  }

  const allErrors: ValidationError[] = [];
  const lines = buildProofLineInfo(steps);

  // Validate each step
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;

    // Build context with lines up to this point, and accessibility from current position
    const contextLines = lines.slice(0, i + 1).map((line, idx) => {
      // A line is accessible if:
      // 1. It's at same depth or shallower than current step
      // 2. It's not inside a closed subproof
      // 3. For lines in the same subproof, they must be before current line
      const accessible = isLineAccessible(lines, idx, i, step.depth);
      return { ...line, accessible };
    });

    const context: ValidationContext = {
      lines: contextLines,
      currentIndex: i,
      currentDepth: step.depth,
      premises,
    };

    // Special handling for premises (first steps at depth 0 with rule 'assumption')
    // In a standard proof, premises come first as assumptions at depth 0
    if (step.rule === 'assumption' && step.depth === 0 && isPremise(step.formula, premises)) {
      // This is a valid premise assumption - skip other validation
      continue;
    }

    // Validate theorem citations
    if (step.rule === 'theorem') {
      const theorem = theoremLibrary.find((t) => t.id === step.theoremId);
      if (!theorem) {
        allErrors.push({
          stepId: step.id,
          message: `Theorem ${step.theoremId} not found in library`,
          code: 'THEOREM_NOT_FOUND',
        });
        continue;
      }
      if (!formulaEquals(theorem.conclusion, step.formula)) {
        allErrors.push({
          stepId: step.id,
          message: 'Formula does not match theorem conclusion',
          code: 'THEOREM_MISMATCH',
        });
      }
      // TODO: Verify theorem premises are satisfied
      continue;
    }

    const stepErrors = validateStep(step, context);
    allErrors.push(...stepErrors);
  }

  // Check if proof is complete (reaches conclusion at depth 0)
  const lastStep = steps[steps.length - 1]!;
  const complete = lastStep.depth === 0 && formulaEquals(lastStep.formula, conclusion);

  return {
    valid: allErrors.length === 0,
    complete,
    errors: allErrors,
  };
}

/**
 * Check if a line is accessible from the current position.
 */
function isLineAccessible(
  lines: ProofLineInfo[],
  targetIdx: number,
  currentIdx: number,
  currentDepth: number
): boolean {
  if (targetIdx > currentIdx) return false;

  const targetLine = lines[targetIdx]!;
  const targetDepth = targetLine.step.depth;

  // Lines at depth 0 are always accessible (they're in the main proof)
  if (targetDepth === 0) return true;

  // For lines in subproofs, we need to check if the subproof is still open
  // A subproof is "open" if we're currently inside it

  // If target is at greater depth than current, it might be in a closed subproof
  if (targetDepth > currentDepth) {
    // Check if we're in the same subproof branch
    return isInSameSubproofBranch(lines, targetIdx, currentIdx);
  }

  // If target is at same or lower depth, it's accessible if not in a closed subproof
  // that's different from our current branch
  return isInSameSubproofBranch(lines, targetIdx, currentIdx);
}

/**
 * Check if two indices are in the same subproof branch.
 */
function isInSameSubproofBranch(
  lines: ProofLineInfo[],
  targetIdx: number,
  currentIdx: number
): boolean {
  // Walk up from target to find containing subproofs
  const targetAncestors = getSubproofAncestors(lines, targetIdx);

  // Target is accessible if all its subproof ancestors contain currentIdx
  for (const ancestor of targetAncestors) {
    const ancestorLine = lines[ancestor]!;

    // If this subproof is closed before currentIdx, target is not accessible
    if (ancestorLine.subproofEnd !== undefined && ancestorLine.subproofEnd < currentIdx) {
      return false;
    }

    // If currentIdx is outside this subproof entirely, target is not accessible
    if (ancestorLine.subproofEnd !== undefined &&
        (currentIdx < ancestor || currentIdx > ancestorLine.subproofEnd)) {
      return false;
    }
  }

  return true;
}

/**
 * Get the indices of all subproof-starting assumptions that contain a given index.
 */
function getSubproofAncestors(lines: ProofLineInfo[], idx: number): number[] {
  const ancestors: number[] = [];
  let currentDepth = lines[idx]!.step.depth;

  for (let i = idx; i >= 0; i--) {
    const line = lines[i]!;
    if (line.isSubproofStart && line.step.depth < currentDepth) {
      ancestors.push(i);
      currentDepth = line.step.depth;
    }
  }

  return ancestors;
}

/**
 * Check if a formula matches one of the premises.
 */
function isPremise(formula: Formula, premises: Formula[]): boolean {
  return premises.some((p) => formulaEquals(p, formula));
}

/**
 * Quick validation for a single step being added to an existing proof.
 * More efficient than rechecking the entire proof.
 */
export function validateNewStep(
  existingSteps: ProofStep[],
  newStep: ProofStep,
  premises: Formula[]
): ValidationError[] {
  const allSteps = [...existingSteps, newStep];
  const lines = buildProofLineInfo(allSteps);
  const currentIdx = allSteps.length - 1;

  const contextLines = lines.map((line, idx) => ({
    ...line,
    accessible: isLineAccessible(lines, idx, currentIdx, newStep.depth),
  }));

  const context: ValidationContext = {
    lines: contextLines,
    currentIndex: currentIdx,
    currentDepth: newStep.depth,
    premises,
  };

  // Handle premises
  if (newStep.rule === 'assumption' && newStep.depth === 0 && isPremise(newStep.formula, premises)) {
    return [];
  }

  return validateStep(newStep, context);
}
