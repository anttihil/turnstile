import { describe, it, expect } from 'vitest';
import { evaluate, isTautology, isContradiction, isSatisfiable, generateAllAssignments } from './evaluate.js';
import {
  generateTruthTable,
  areEquivalent,
  areJointlySatisfiable,
  entails,
  findCounterexample,
  validateTruthTableSubmission,
} from './generate.js';
import { Var, Not, And, Or, Implies, Iff, Bottom } from '../types.js';
import { parse } from '../parser/parser.js';

describe('evaluate', () => {
  it('evaluates variable', () => {
    expect(evaluate(Var('P'), { P: true })).toBe(true);
    expect(evaluate(Var('P'), { P: false })).toBe(false);
  });

  it('evaluates bottom as false', () => {
    expect(evaluate(Bottom, {})).toBe(false);
  });

  it('evaluates negation', () => {
    expect(evaluate(Not(Var('P')), { P: true })).toBe(false);
    expect(evaluate(Not(Var('P')), { P: false })).toBe(true);
  });

  it('evaluates conjunction', () => {
    expect(evaluate(And(Var('P'), Var('Q')), { P: true, Q: true })).toBe(true);
    expect(evaluate(And(Var('P'), Var('Q')), { P: true, Q: false })).toBe(false);
    expect(evaluate(And(Var('P'), Var('Q')), { P: false, Q: true })).toBe(false);
    expect(evaluate(And(Var('P'), Var('Q')), { P: false, Q: false })).toBe(false);
  });

  it('evaluates disjunction', () => {
    expect(evaluate(Or(Var('P'), Var('Q')), { P: true, Q: true })).toBe(true);
    expect(evaluate(Or(Var('P'), Var('Q')), { P: true, Q: false })).toBe(true);
    expect(evaluate(Or(Var('P'), Var('Q')), { P: false, Q: true })).toBe(true);
    expect(evaluate(Or(Var('P'), Var('Q')), { P: false, Q: false })).toBe(false);
  });

  it('evaluates implication', () => {
    expect(evaluate(Implies(Var('P'), Var('Q')), { P: true, Q: true })).toBe(true);
    expect(evaluate(Implies(Var('P'), Var('Q')), { P: true, Q: false })).toBe(false);
    expect(evaluate(Implies(Var('P'), Var('Q')), { P: false, Q: true })).toBe(true);
    expect(evaluate(Implies(Var('P'), Var('Q')), { P: false, Q: false })).toBe(true);
  });

  it('evaluates biconditional', () => {
    expect(evaluate(Iff(Var('P'), Var('Q')), { P: true, Q: true })).toBe(true);
    expect(evaluate(Iff(Var('P'), Var('Q')), { P: true, Q: false })).toBe(false);
    expect(evaluate(Iff(Var('P'), Var('Q')), { P: false, Q: true })).toBe(false);
    expect(evaluate(Iff(Var('P'), Var('Q')), { P: false, Q: false })).toBe(true);
  });

  it('evaluates complex formula', () => {
    // (P → Q) ∧ P → Q (modus ponens)
    const formula = Implies(And(Implies(Var('P'), Var('Q')), Var('P')), Var('Q'));
    expect(evaluate(formula, { P: true, Q: true })).toBe(true);
    expect(evaluate(formula, { P: true, Q: false })).toBe(true);
    expect(evaluate(formula, { P: false, Q: true })).toBe(true);
    expect(evaluate(formula, { P: false, Q: false })).toBe(true);
  });

  it('throws for missing variable', () => {
    expect(() => evaluate(Var('P'), {})).toThrow("Variable 'P' not found");
  });
});

describe('generateAllAssignments', () => {
  it('generates assignments for single variable', () => {
    const assignments = Array.from(generateAllAssignments(['P']));
    expect(assignments).toHaveLength(2);
    expect(assignments[0]).toEqual({ P: true });
    expect(assignments[1]).toEqual({ P: false });
  });

  it('generates assignments for two variables', () => {
    const assignments = Array.from(generateAllAssignments(['P', 'Q']));
    expect(assignments).toHaveLength(4);
    expect(assignments[0]).toEqual({ P: true, Q: true });
    expect(assignments[1]).toEqual({ P: true, Q: false });
    expect(assignments[2]).toEqual({ P: false, Q: true });
    expect(assignments[3]).toEqual({ P: false, Q: false });
  });

  it('generates assignments for three variables', () => {
    const assignments = Array.from(generateAllAssignments(['P', 'Q', 'R']));
    expect(assignments).toHaveLength(8);
  });

  it('handles empty variable list', () => {
    const assignments = Array.from(generateAllAssignments([]));
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toEqual({});
  });
});

describe('isTautology', () => {
  it('identifies P ∨ ¬P as tautology', () => {
    const formula = Or(Var('P'), Not(Var('P')));
    expect(isTautology(formula, ['P'])).toBe(true);
  });

  it('identifies P → P as tautology', () => {
    expect(isTautology(Implies(Var('P'), Var('P')), ['P'])).toBe(true);
  });

  it('identifies modus ponens as tautology', () => {
    // ((P → Q) ∧ P) → Q
    const formula = Implies(And(Implies(Var('P'), Var('Q')), Var('P')), Var('Q'));
    expect(isTautology(formula, ['P', 'Q'])).toBe(true);
  });

  it('identifies P ∧ ¬P as not a tautology', () => {
    const formula = And(Var('P'), Not(Var('P')));
    expect(isTautology(formula, ['P'])).toBe(false);
  });

  it('identifies P as not a tautology', () => {
    expect(isTautology(Var('P'), ['P'])).toBe(false);
  });
});

describe('isContradiction', () => {
  it('identifies P ∧ ¬P as contradiction', () => {
    const formula = And(Var('P'), Not(Var('P')));
    expect(isContradiction(formula, ['P'])).toBe(true);
  });

  it('identifies ⊥ as contradiction', () => {
    expect(isContradiction(Bottom, [])).toBe(true);
  });

  it('identifies P ∨ ¬P as not a contradiction', () => {
    const formula = Or(Var('P'), Not(Var('P')));
    expect(isContradiction(formula, ['P'])).toBe(false);
  });
});

describe('isSatisfiable', () => {
  it('identifies P as satisfiable', () => {
    expect(isSatisfiable(Var('P'), ['P'])).toBe(true);
  });

  it('identifies P ∧ Q as satisfiable', () => {
    expect(isSatisfiable(And(Var('P'), Var('Q')), ['P', 'Q'])).toBe(true);
  });

  it('identifies P ∧ ¬P as not satisfiable', () => {
    const formula = And(Var('P'), Not(Var('P')));
    expect(isSatisfiable(formula, ['P'])).toBe(false);
  });

  it('identifies ⊥ as not satisfiable', () => {
    expect(isSatisfiable(Bottom, [])).toBe(false);
  });
});

describe('generateTruthTable', () => {
  it('generates table for simple variable', () => {
    const table = generateTruthTable(Var('P'));
    expect(table.variables).toEqual(['P']);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]).toEqual({ inputs: { P: true }, result: true });
    expect(table.rows[1]).toEqual({ inputs: { P: false }, result: false });
  });

  it('generates table for P ∧ Q', () => {
    const table = generateTruthTable(And(Var('P'), Var('Q')));
    expect(table.variables).toEqual(['P', 'Q']);
    expect(table.rows).toHaveLength(4);
    expect(table.rows[0]).toEqual({ inputs: { P: true, Q: true }, result: true });
    expect(table.rows[1]).toEqual({ inputs: { P: true, Q: false }, result: false });
    expect(table.rows[2]).toEqual({ inputs: { P: false, Q: true }, result: false });
    expect(table.rows[3]).toEqual({ inputs: { P: false, Q: false }, result: false });
  });

  it('identifies tautology', () => {
    const table = generateTruthTable(Or(Var('P'), Not(Var('P'))));
    expect(table.isTautology).toBe(true);
    expect(table.isContradiction).toBe(false);
    expect(table.isSatisfiable).toBe(true);
  });

  it('identifies contradiction', () => {
    const table = generateTruthTable(And(Var('P'), Not(Var('P'))));
    expect(table.isTautology).toBe(false);
    expect(table.isContradiction).toBe(true);
    expect(table.isSatisfiable).toBe(false);
  });

  it('identifies contingent formula', () => {
    const table = generateTruthTable(Var('P'));
    expect(table.isTautology).toBe(false);
    expect(table.isContradiction).toBe(false);
    expect(table.isSatisfiable).toBe(true);
  });
});

describe('areEquivalent', () => {
  it('identifies P ∨ Q ≡ Q ∨ P (commutativity)', () => {
    expect(areEquivalent(Or(Var('P'), Var('Q')), Or(Var('Q'), Var('P')))).toBe(true);
  });

  it('identifies P ∧ Q ≡ Q ∧ P (commutativity)', () => {
    expect(areEquivalent(And(Var('P'), Var('Q')), And(Var('Q'), Var('P')))).toBe(true);
  });

  it('identifies ¬¬P ≡ P (double negation)', () => {
    expect(areEquivalent(Not(Not(Var('P'))), Var('P'))).toBe(true);
  });

  it('identifies P → Q ≡ ¬P ∨ Q (material implication)', () => {
    expect(areEquivalent(Implies(Var('P'), Var('Q')), Or(Not(Var('P')), Var('Q')))).toBe(true);
  });

  it('identifies ¬(P ∧ Q) ≡ ¬P ∨ ¬Q (De Morgan)', () => {
    expect(
      areEquivalent(Not(And(Var('P'), Var('Q'))), Or(Not(Var('P')), Not(Var('Q'))))
    ).toBe(true);
  });

  it('identifies ¬(P ∨ Q) ≡ ¬P ∧ ¬Q (De Morgan)', () => {
    expect(
      areEquivalent(Not(Or(Var('P'), Var('Q'))), And(Not(Var('P')), Not(Var('Q'))))
    ).toBe(true);
  });

  it('identifies non-equivalent formulas', () => {
    expect(areEquivalent(Var('P'), Var('Q'))).toBe(false);
    expect(areEquivalent(And(Var('P'), Var('Q')), Or(Var('P'), Var('Q')))).toBe(false);
  });
});

describe('areJointlySatisfiable', () => {
  it('returns true for empty set', () => {
    expect(areJointlySatisfiable([])).toBe(true);
  });

  it('returns true for satisfiable single formula', () => {
    expect(areJointlySatisfiable([Var('P')])).toBe(true);
  });

  it('returns true for consistent set', () => {
    expect(areJointlySatisfiable([Var('P'), Implies(Var('P'), Var('Q'))])).toBe(true);
  });

  it('returns false for inconsistent set', () => {
    expect(areJointlySatisfiable([Var('P'), Not(Var('P'))])).toBe(false);
  });

  it('returns false for larger inconsistent set', () => {
    expect(
      areJointlySatisfiable([
        Implies(Var('P'), Var('Q')),
        Implies(Var('Q'), Var('R')),
        Var('P'),
        Not(Var('R')),
      ])
    ).toBe(false);
  });
});

describe('entails', () => {
  it('validates modus ponens', () => {
    // P, P → Q ⊨ Q
    const premises = [Var('P'), Implies(Var('P'), Var('Q'))];
    expect(entails(premises, Var('Q'))).toBe(true);
  });

  it('validates modus tollens', () => {
    // P → Q, ¬Q ⊨ ¬P
    const premises = [Implies(Var('P'), Var('Q')), Not(Var('Q'))];
    expect(entails(premises, Not(Var('P')))).toBe(true);
  });

  it('validates hypothetical syllogism', () => {
    // P → Q, Q → R ⊨ P → R
    const premises = [Implies(Var('P'), Var('Q')), Implies(Var('Q'), Var('R'))];
    expect(entails(premises, Implies(Var('P'), Var('R')))).toBe(true);
  });

  it('validates disjunctive syllogism', () => {
    // P ∨ Q, ¬P ⊨ Q
    const premises = [Or(Var('P'), Var('Q')), Not(Var('P'))];
    expect(entails(premises, Var('Q'))).toBe(true);
  });

  it('rejects invalid argument', () => {
    // P ∨ Q, P ⊭ Q (affirming the disjunct)
    const premises = [Or(Var('P'), Var('Q')), Var('P')];
    expect(entails(premises, Var('Q'))).toBe(false);
  });

  it('handles empty premises (tautological conclusion)', () => {
    expect(entails([], Or(Var('P'), Not(Var('P'))))).toBe(true);
    expect(entails([], Var('P'))).toBe(false);
  });
});

describe('findCounterexample', () => {
  it('returns null for valid argument', () => {
    // P, P → Q ⊨ Q
    const premises = [Var('P'), Implies(Var('P'), Var('Q'))];
    expect(findCounterexample(premises, Var('Q'))).toBeNull();
  });

  it('returns counterexample for invalid argument', () => {
    // P ∨ Q, P ⊭ Q
    const premises = [Or(Var('P'), Var('Q')), Var('P')];
    const counterexample = findCounterexample(premises, Var('Q'));
    expect(counterexample).not.toBeNull();
    expect(counterexample!.P).toBe(true);
    expect(counterexample!.Q).toBe(false);
  });

  it('returns counterexample for affirming the consequent', () => {
    // P → Q, Q ⊭ P
    const premises = [Implies(Var('P'), Var('Q')), Var('Q')];
    const counterexample = findCounterexample(premises, Var('P'));
    expect(counterexample).not.toBeNull();
  });
});

describe('validateTruthTableSubmission', () => {
  it('validates correct submission', () => {
    const formula = And(Var('P'), Var('Q'));
    const submission = [
      { inputs: [true, true], output: true },
      { inputs: [true, false], output: false },
      { inputs: [false, true], output: false },
      { inputs: [false, false], output: false },
    ];
    const result = validateTruthTableSubmission(formula, submission, ['P', 'Q']);
    expect(result.correct).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('identifies incorrect row', () => {
    const formula = And(Var('P'), Var('Q'));
    const submission = [
      { inputs: [true, true], output: false }, // Wrong!
      { inputs: [true, false], output: false },
      { inputs: [false, true], output: false },
      { inputs: [false, false], output: false },
    ];
    const result = validateTruthTableSubmission(formula, submission, ['P', 'Q']);
    expect(result.correct).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ row: 0, expected: true });
  });

  it('identifies multiple errors', () => {
    const formula = Or(Var('P'), Var('Q'));
    const submission = [
      { inputs: [true, true], output: false },   // Wrong
      { inputs: [true, false], output: false },  // Wrong
      { inputs: [false, true], output: true },   // Correct
      { inputs: [false, false], output: true },  // Wrong
    ];
    const result = validateTruthTableSubmission(formula, submission, ['P', 'Q']);
    expect(result.correct).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
});

describe('integration with parser', () => {
  it('evaluates parsed formula', () => {
    const formula = parse('P -> (Q -> P)');
    const table = generateTruthTable(formula);
    expect(table.isTautology).toBe(true);
  });

  it('checks equivalence of parsed formulas', () => {
    const a = parse('~(P /\\ Q)');
    const b = parse('~P \\/ ~Q');
    expect(areEquivalent(a, b)).toBe(true);
  });

  it('validates parsed argument', () => {
    const premises = [parse('P -> Q'), parse('Q -> R')];
    const conclusion = parse('P -> R');
    expect(entails(premises, conclusion)).toBe(true);
  });
});
