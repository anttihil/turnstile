import type { Formula } from '../types.js';
import { formulaEquals } from '../parser/parser.js';

// ============================================================================
// Pattern AST
// ============================================================================

/**
 * A pattern mirrors Formula but adds metavariables for schema matching.
 * Kept separate from Formula — no metavariable leaking into the core domain.
 */
export type Pattern =
  | { kind: 'meta'; name: string }
  | { kind: 'bottom' }
  | { kind: 'not'; operand: Pattern }
  | { kind: 'and'; left: Pattern; right: Pattern }
  | { kind: 'or'; left: Pattern; right: Pattern }
  | { kind: 'implies'; left: Pattern; right: Pattern }
  | { kind: 'iff'; left: Pattern; right: Pattern };

// Pattern constructors
export const Meta = (name: string): Pattern => ({ kind: 'meta', name });
export const PBottom: Pattern = { kind: 'bottom' };
export const PNot = (operand: Pattern): Pattern => ({ kind: 'not', operand });
export const PAnd = (left: Pattern, right: Pattern): Pattern => ({ kind: 'and', left, right });
export const POr = (left: Pattern, right: Pattern): Pattern => ({ kind: 'or', left, right });
export const PImplies = (left: Pattern, right: Pattern): Pattern => ({ kind: 'implies', left, right });
export const PIff = (left: Pattern, right: Pattern): Pattern => ({ kind: 'iff', left, right });

// ============================================================================
// Substitution & Matching
// ============================================================================

/** Maps metavariable names to bound formulas. */
export type Substitution = Map<string, Formula>;

/**
 * Match a pattern against a formula, threading a substitution.
 * Returns the (possibly extended) substitution on success, or null on failure.
 *
 * - `meta`: bind if unbound, check consistency if already bound
 * - `bottom`: match only `bottom`
 * - Connectives: match kind, recurse on children
 *
 * Free metavariables (appearing only in conclusion, not premises) bind to
 * whatever the actual formula is — this handles bottom_elim (any conclusion)
 * and or_intro_l/r (arbitrary other disjunct) with zero special cases.
 */
export function matchPattern(
  pattern: Pattern,
  formula: Formula,
  subst: Substitution,
): Substitution | null {
  switch (pattern.kind) {
    case 'meta': {
      const existing = subst.get(pattern.name);
      if (existing !== undefined) {
        return formulaEquals(existing, formula) ? subst : null;
      }
      subst.set(pattern.name, formula);
      return subst;
    }

    case 'bottom':
      return formula.kind === 'bottom' ? subst : null;

    case 'not':
      if (formula.kind !== 'not') return null;
      return matchPattern(pattern.operand, formula.operand, subst);

    case 'and':
    case 'or':
    case 'implies':
    case 'iff': {
      if (formula.kind !== pattern.kind) return null;
      const after = matchPattern(pattern.left, (formula as { left: Formula }).left, subst);
      if (!after) return null;
      return matchPattern(pattern.right, (formula as { right: Formula }).right, after);
    }
  }
}

// ============================================================================
// Formula → Pattern Conversion
// ============================================================================

/**
 * Convert a concrete Formula to a Pattern by treating propositional variable
 * nodes as metavariables. Used to derive schemas from proven theorems.
 */
export function formulaToPattern(formula: Formula): Pattern {
  switch (formula.kind) {
    case 'var':     return Meta(formula.name);
    case 'bottom':  return PBottom;
    case 'not':     return PNot(formulaToPattern(formula.operand));
    case 'and':     return PAnd(formulaToPattern(formula.left), formulaToPattern(formula.right));
    case 'or':      return POr(formulaToPattern(formula.left), formulaToPattern(formula.right));
    case 'implies': return PImplies(formulaToPattern(formula.left), formulaToPattern(formula.right));
    case 'iff':     return PIff(formulaToPattern(formula.left), formulaToPattern(formula.right));
  }
}
