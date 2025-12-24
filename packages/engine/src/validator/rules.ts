import type { InferenceRule, RuleDefinition } from '../types.js';

/**
 * Primitive inference rules (always available).
 */
export const PRIMITIVE_RULES: InferenceRule[] = [
  'assumption',
  'and_intro',
  'and_elim_l',
  'and_elim_r',
  'or_intro_l',
  'or_intro_r',
  'or_elim',
  'implies_intro',
  'implies_elim',
  'not_intro',
  'not_elim',
  'iff_intro',
  'iff_elim',
  'bottom_elim',
  'raa',
];

/**
 * Get human-readable name for an inference rule.
 */
export function getRuleName(rule: InferenceRule): string {
  const names: Record<InferenceRule, string> = {
    assumption: 'Assumption',
    and_intro: 'Conjunction Introduction (∧I)',
    and_elim_l: 'Conjunction Elimination Left (∧E)',
    and_elim_r: 'Conjunction Elimination Right (∧E)',
    or_intro_l: 'Disjunction Introduction Left (∨I)',
    or_intro_r: 'Disjunction Introduction Right (∨I)',
    or_elim: 'Disjunction Elimination (∨E)',
    implies_intro: 'Conditional Introduction (→I)',
    implies_elim: 'Conditional Elimination (→E)',
    not_intro: 'Negation Introduction (¬I)',
    not_elim: 'Negation Elimination (¬E)',
    iff_intro: 'Biconditional Introduction (↔I)',
    iff_elim: 'Biconditional Elimination (↔E)',
    bottom_elim: 'Falsum Elimination (⊥E)',
    raa: 'Reductio ad Absurdum (RAA)',
    theorem: 'Theorem',
  };
  return names[rule];
}

/**
 * Get abbreviation for an inference rule.
 */
export function getRuleAbbreviation(rule: InferenceRule): string {
  const abbrevs: Record<InferenceRule, string> = {
    assumption: 'A',
    and_intro: '∧I',
    and_elim_l: '∧E',
    and_elim_r: '∧E',
    or_intro_l: '∨I',
    or_intro_r: '∨I',
    or_elim: '∨E',
    implies_intro: '→I',
    implies_elim: '→E',
    not_intro: '¬I',
    not_elim: '¬E',
    iff_intro: '↔I',
    iff_elim: '↔E',
    bottom_elim: '⊥E',
    raa: 'RAA',
    theorem: 'T',
  };
  return abbrevs[rule];
}

/**
 * Get the number of justifications required for a rule.
 * Returns [min, max] where max can be Infinity for rules like or_elim.
 */
export function getRequiredJustificationCount(rule: InferenceRule): [number, number] {
  switch (rule) {
    case 'assumption':
      return [0, 0]; // Opens subproof, no justification needed
    case 'and_intro':
      return [2, 2]; // Need A and B to get A ∧ B
    case 'and_elim_l':
    case 'and_elim_r':
      return [1, 1]; // Need A ∧ B to get A or B
    case 'or_intro_l':
    case 'or_intro_r':
      return [1, 1]; // Need A to get A ∨ B
    case 'or_elim':
      return [3, 3]; // Need A ∨ B, subproof A→C, subproof B→C
    case 'implies_intro':
      return [1, 1]; // Need subproof A→B
    case 'implies_elim':
      return [2, 2]; // Need A → B and A
    case 'not_intro':
      return [1, 1]; // Need subproof A→⊥
    case 'not_elim':
      return [1, 1]; // Need ¬¬A to get A
    case 'iff_intro':
      return [2, 2]; // Need A→B and B→A
    case 'iff_elim':
      return [2, 2]; // Need A↔B and A (or B)
    case 'bottom_elim':
      return [1, 1]; // Need ⊥ to get anything
    case 'raa':
      return [1, 1]; // Need subproof ¬A→⊥
    case 'theorem':
      return [0, 0]; // Citing proven theorem, no line justification
  }
}

/**
 * Check if a rule opens a subproof.
 */
export function opensSubproof(rule: InferenceRule): boolean {
  return rule === 'assumption';
}

/**
 * Check if a rule uses subproof justifications.
 */
export function usesSubproofJustification(rule: InferenceRule): boolean {
  return (
    rule === 'implies_intro' ||
    rule === 'not_intro' ||
    rule === 'raa' ||
    rule === 'or_elim'
  );
}

/**
 * Built-in rule definitions for the UI.
 */
export const RULE_DEFINITIONS: RuleDefinition[] = [
  {
    id: 'assumption',
    name: 'Assumption',
    abbreviation: 'A',
    category: 'primitive',
    description: 'Assume a formula to begin a subproof',
    schema: { premises: [], conclusion: 'P (any formula)' },
  },
  {
    id: 'and_intro',
    name: 'Conjunction Introduction',
    abbreviation: '∧I',
    category: 'primitive',
    description: 'From A and B, derive A ∧ B',
    schema: { premises: ['A', 'B'], conclusion: 'A ∧ B' },
  },
  {
    id: 'and_elim_l',
    name: 'Conjunction Elimination (Left)',
    abbreviation: '∧E',
    category: 'primitive',
    description: 'From A ∧ B, derive A',
    schema: { premises: ['A ∧ B'], conclusion: 'A' },
  },
  {
    id: 'and_elim_r',
    name: 'Conjunction Elimination (Right)',
    abbreviation: '∧E',
    category: 'primitive',
    description: 'From A ∧ B, derive B',
    schema: { premises: ['A ∧ B'], conclusion: 'B' },
  },
  {
    id: 'or_intro_l',
    name: 'Disjunction Introduction (Left)',
    abbreviation: '∨I',
    category: 'primitive',
    description: 'From A, derive A ∨ B',
    schema: { premises: ['A'], conclusion: 'A ∨ B' },
  },
  {
    id: 'or_intro_r',
    name: 'Disjunction Introduction (Right)',
    abbreviation: '∨I',
    category: 'primitive',
    description: 'From B, derive A ∨ B',
    schema: { premises: ['B'], conclusion: 'A ∨ B' },
  },
  {
    id: 'or_elim',
    name: 'Disjunction Elimination',
    abbreviation: '∨E',
    category: 'primitive',
    description: 'From A ∨ B, and subproofs A→C and B→C, derive C',
    schema: { premises: ['A ∨ B', '[A]...C', '[B]...C'], conclusion: 'C' },
  },
  {
    id: 'implies_intro',
    name: 'Conditional Introduction',
    abbreviation: '→I',
    category: 'primitive',
    description: 'From a subproof starting with A and ending with B, derive A → B',
    schema: { premises: ['[A]...B'], conclusion: 'A → B' },
  },
  {
    id: 'implies_elim',
    name: 'Conditional Elimination (Modus Ponens)',
    abbreviation: '→E',
    category: 'primitive',
    description: 'From A → B and A, derive B',
    schema: { premises: ['A → B', 'A'], conclusion: 'B' },
  },
  {
    id: 'not_intro',
    name: 'Negation Introduction',
    abbreviation: '¬I',
    category: 'primitive',
    description: 'From a subproof starting with A and ending with ⊥, derive ¬A',
    schema: { premises: ['[A]...⊥'], conclusion: '¬A' },
  },
  {
    id: 'not_elim',
    name: 'Double Negation Elimination',
    abbreviation: '¬E',
    category: 'primitive',
    description: 'From ¬¬A, derive A',
    schema: { premises: ['¬¬A'], conclusion: 'A' },
  },
  {
    id: 'iff_intro',
    name: 'Biconditional Introduction',
    abbreviation: '↔I',
    category: 'primitive',
    description: 'From A → B and B → A, derive A ↔ B',
    schema: { premises: ['A → B', 'B → A'], conclusion: 'A ↔ B' },
  },
  {
    id: 'iff_elim',
    name: 'Biconditional Elimination',
    abbreviation: '↔E',
    category: 'primitive',
    description: 'From A ↔ B and A, derive B (or from A ↔ B and B, derive A)',
    schema: { premises: ['A ↔ B', 'A (or B)'], conclusion: 'B (or A)' },
  },
  {
    id: 'bottom_elim',
    name: 'Falsum Elimination',
    abbreviation: '⊥E',
    category: 'primitive',
    description: 'From ⊥, derive any formula',
    schema: { premises: ['⊥'], conclusion: 'P (any formula)' },
  },
  {
    id: 'raa',
    name: 'Reductio ad Absurdum',
    abbreviation: 'RAA',
    category: 'primitive',
    description: 'From a subproof starting with ¬A and ending with ⊥, derive A',
    schema: { premises: ['[¬A]...⊥'], conclusion: 'A' },
  },
];
