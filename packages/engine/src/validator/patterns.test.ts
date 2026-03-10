import { describe, it, expect } from 'vitest';
import { matchPattern, Meta, PBottom, PNot, PAnd, POr, PImplies, PIff } from './patterns.js';
import type { Substitution } from './patterns.js';
import { Var, Not, And, Or, Implies, Iff, Bottom } from '../types.js';
import type { InferenceRule } from '../types.js';
import { SCHEMAS_BY_RULE } from './schemas.js';

describe('matchPattern', () => {
  const emptySubst = (): Substitution => new Map();

  describe('metavariable binding', () => {
    it('binds unbound metavariable', () => {
      const subst = matchPattern(Meta('A'), Var('P'), emptySubst());
      expect(subst).not.toBeNull();
      expect(subst!.get('A')).toEqual(Var('P'));
    });

    it('binds to complex formula', () => {
      const formula = And(Var('P'), Or(Var('Q'), Var('R')));
      const subst = matchPattern(Meta('X'), formula, emptySubst());
      expect(subst).not.toBeNull();
      expect(subst!.get('X')).toEqual(formula);
    });

    it('succeeds when metavariable re-bound to same formula', () => {
      const s = emptySubst();
      s.set('A', Var('P'));
      const result = matchPattern(Meta('A'), Var('P'), s);
      expect(result).not.toBeNull();
    });

    it('fails when metavariable re-bound to different formula', () => {
      const s = emptySubst();
      s.set('A', Var('P'));
      const result = matchPattern(Meta('A'), Var('Q'), s);
      expect(result).toBeNull();
    });
  });

  describe('bottom matching', () => {
    it('matches bottom', () => {
      expect(matchPattern(PBottom, Bottom, emptySubst())).not.toBeNull();
    });

    it('rejects non-bottom', () => {
      expect(matchPattern(PBottom, Var('P'), emptySubst())).toBeNull();
    });
  });

  describe('structural matching', () => {
    it('matches negation pattern', () => {
      const result = matchPattern(PNot(Meta('A')), Not(Var('P')), emptySubst());
      expect(result).not.toBeNull();
      expect(result!.get('A')).toEqual(Var('P'));
    });

    it('rejects wrong connective', () => {
      expect(matchPattern(PAnd(Meta('A'), Meta('B')), Or(Var('P'), Var('Q')), emptySubst())).toBeNull();
    });

    it('matches conjunction', () => {
      const result = matchPattern(PAnd(Meta('A'), Meta('B')), And(Var('P'), Var('Q')), emptySubst());
      expect(result).not.toBeNull();
      expect(result!.get('A')).toEqual(Var('P'));
      expect(result!.get('B')).toEqual(Var('Q'));
    });

    it('matches disjunction', () => {
      const result = matchPattern(POr(Meta('A'), Meta('B')), Or(Var('X'), Var('Y')), emptySubst());
      expect(result).not.toBeNull();
      expect(result!.get('A')).toEqual(Var('X'));
      expect(result!.get('B')).toEqual(Var('Y'));
    });

    it('matches implication', () => {
      const result = matchPattern(PImplies(Meta('A'), Meta('B')), Implies(Var('P'), Var('Q')), emptySubst());
      expect(result).not.toBeNull();
      expect(result!.get('A')).toEqual(Var('P'));
      expect(result!.get('B')).toEqual(Var('Q'));
    });

    it('matches biconditional', () => {
      const result = matchPattern(PIff(Meta('A'), Meta('B')), Iff(Var('P'), Var('Q')), emptySubst());
      expect(result).not.toBeNull();
      expect(result!.get('A')).toEqual(Var('P'));
      expect(result!.get('B')).toEqual(Var('Q'));
    });
  });

  describe('nested patterns', () => {
    it('matches double negation pattern', () => {
      const result = matchPattern(PNot(PNot(Meta('A'))), Not(Not(Var('P'))), emptySubst());
      expect(result).not.toBeNull();
      expect(result!.get('A')).toEqual(Var('P'));
    });

    it('rejects single negation against double negation pattern', () => {
      expect(matchPattern(PNot(PNot(Meta('A'))), Not(Var('P')), emptySubst())).toBeNull();
    });

    it('matches nested structure with consistency', () => {
      // Pattern: A → A (same metavar on both sides)
      const result = matchPattern(PImplies(Meta('A'), Meta('A')), Implies(Var('P'), Var('P')), emptySubst());
      expect(result).not.toBeNull();
    });

    it('rejects inconsistent metavariable binding', () => {
      // Pattern: A → A but formula has different sides
      const result = matchPattern(PImplies(Meta('A'), Meta('A')), Implies(Var('P'), Var('Q')), emptySubst());
      expect(result).toBeNull();
    });
  });

  describe('wildcard binding (free metavariables)', () => {
    it('bottom_elim: any conclusion via free metavariable', () => {
      // Matching only the conclusion pattern Meta('A') against any formula
      const result = matchPattern(Meta('A'), And(Var('P'), Var('Q')), emptySubst());
      expect(result).not.toBeNull();
      expect(result!.get('A')).toEqual(And(Var('P'), Var('Q')));
    });

    it('or_intro: free metavariable for other disjunct', () => {
      // Pattern: A ∨ B where A is already bound but B is free
      const s = emptySubst();
      s.set('A', Var('P'));
      const result = matchPattern(POr(Meta('A'), Meta('B')), Or(Var('P'), Var('Q')), s);
      expect(result).not.toBeNull();
      expect(result!.get('B')).toEqual(Var('Q'));
    });
  });
});

describe('schema coverage', () => {
  it('every InferenceRule (except assumption and theorem) has at least one schema', () => {
    const allRules: InferenceRule[] = [
      'and_intro', 'and_elim_l', 'and_elim_r',
      'or_intro_l', 'or_intro_r', 'or_elim',
      'implies_intro', 'implies_elim',
      'not_intro', 'not_elim',
      'iff_intro', 'iff_elim',
      'bottom_elim', 'raa',
    ];

    for (const rule of allRules) {
      const schemas = SCHEMAS_BY_RULE.get(rule);
      expect(schemas, `Missing schema for rule: ${rule}`).toBeDefined();
      expect(schemas!.length, `Empty schema list for rule: ${rule}`).toBeGreaterThan(0);
    }
  });

  it('assumption and theorem have no schemas (handled explicitly)', () => {
    expect(SCHEMAS_BY_RULE.get('assumption')).toBeUndefined();
    expect(SCHEMAS_BY_RULE.get('theorem')).toBeUndefined();
  });
});
