import { describe, it, expect } from 'vitest';
import { tokenize, Lexer } from './lexer.js';
import { parseFormula, parse, formulaEquals, extractVariables } from './parser.js';
import { printFormula, printAscii, printUtf8, printSequent } from './printer.js';
import { Formula, Var, Not, And, Or, Implies, Iff, Bottom } from '../types.js';

describe('Lexer', () => {
  describe('tokenize', () => {
    it('tokenizes simple variable', () => {
      const tokens = tokenize('P');
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toEqual({ type: 'VAR', value: 'P', position: 0 });
      expect(tokens[1]).toEqual({ type: 'EOF', value: '', position: 1 });
    });

    it('tokenizes multi-character variable', () => {
      const tokens = tokenize('Foo123');
      expect(tokens[0]).toEqual({ type: 'VAR', value: 'Foo123', position: 0 });
    });

    it('tokenizes ASCII operators', () => {
      const tokens = tokenize('~P /\\ Q \\/ R -> S <-> T');
      expect(tokens.map(t => t.type)).toEqual([
        'NOT', 'VAR', 'AND', 'VAR', 'OR', 'VAR', 'IMPLIES', 'VAR', 'IFF', 'VAR', 'EOF'
      ]);
    });

    it('tokenizes UTF-8 operators', () => {
      const tokens = tokenize('¬P ∧ Q ∨ R → S ↔ T');
      expect(tokens.map(t => t.type)).toEqual([
        'NOT', 'VAR', 'AND', 'VAR', 'OR', 'VAR', 'IMPLIES', 'VAR', 'IFF', 'VAR', 'EOF'
      ]);
    });

    it('tokenizes alternative operators', () => {
      const tokens = tokenize('P & Q | R');
      expect(tokens.map(t => t.type)).toEqual(['VAR', 'AND', 'VAR', 'OR', 'VAR', 'EOF']);
    });

    it('tokenizes bottom', () => {
      expect(tokenize('_|_')[0]!.type).toBe('BOTTOM');
      expect(tokenize('⊥')[0]!.type).toBe('BOTTOM');
    });

    it('tokenizes parentheses', () => {
      const tokens = tokenize('(P)');
      expect(tokens.map(t => t.type)).toEqual(['LPAREN', 'VAR', 'RPAREN', 'EOF']);
    });

    it('skips whitespace', () => {
      const tokens = tokenize('  P   ');
      expect(tokens).toHaveLength(2);
      expect(tokens[0]!.type).toBe('VAR');
    });
  });
});

describe('Parser', () => {
  describe('parseFormula', () => {
    it('parses simple variable', () => {
      const result = parseFormula('P');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(Var('P'));
      }
    });

    it('parses bottom', () => {
      const result = parseFormula('_|_');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(Bottom);
      }
    });

    it('parses negation', () => {
      const result = parseFormula('~P');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(Not(Var('P')));
      }
    });

    it('parses double negation', () => {
      const result = parseFormula('~~P');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(Not(Not(Var('P'))));
      }
    });

    it('parses conjunction', () => {
      const result = parseFormula('P /\\ Q');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(And(Var('P'), Var('Q')));
      }
    });

    it('parses disjunction', () => {
      const result = parseFormula('P \\/ Q');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(Or(Var('P'), Var('Q')));
      }
    });

    it('parses implication', () => {
      const result = parseFormula('P -> Q');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(Implies(Var('P'), Var('Q')));
      }
    });

    it('parses biconditional', () => {
      const result = parseFormula('P <-> Q');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(Iff(Var('P'), Var('Q')));
      }
    });

    it('parses parenthesized formula', () => {
      const result = parseFormula('(P)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(Var('P'));
      }
    });

    it('parses nested parentheses', () => {
      const result = parseFormula('((P))');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(Var('P'));
      }
    });

    it('handles precedence: AND binds tighter than OR', () => {
      const result = parseFormula('P \\/ Q /\\ R');
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be P ∨ (Q ∧ R)
        expect(result.value).toEqual(Or(Var('P'), And(Var('Q'), Var('R'))));
      }
    });

    it('handles precedence: OR binds tighter than IMPLIES', () => {
      const result = parseFormula('P -> Q \\/ R');
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be P → (Q ∨ R)
        expect(result.value).toEqual(Implies(Var('P'), Or(Var('Q'), Var('R'))));
      }
    });

    it('handles precedence: IMPLIES binds tighter than IFF', () => {
      const result = parseFormula('P <-> Q -> R');
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be P ↔ (Q → R)
        expect(result.value).toEqual(Iff(Var('P'), Implies(Var('Q'), Var('R'))));
      }
    });

    it('implication is right-associative', () => {
      const result = parseFormula('P -> Q -> R');
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be P → (Q → R)
        expect(result.value).toEqual(Implies(Var('P'), Implies(Var('Q'), Var('R'))));
      }
    });

    it('conjunction is left-associative', () => {
      const result = parseFormula('P /\\ Q /\\ R');
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be (P ∧ Q) ∧ R
        expect(result.value).toEqual(And(And(Var('P'), Var('Q')), Var('R')));
      }
    });

    it('disjunction is left-associative', () => {
      const result = parseFormula('P \\/ Q \\/ R');
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be (P ∨ Q) ∨ R
        expect(result.value).toEqual(Or(Or(Var('P'), Var('Q')), Var('R')));
      }
    });

    it('NOT binds tighter than AND', () => {
      const result = parseFormula('~P /\\ Q');
      expect(result.success).toBe(true);
      if (result.success) {
        // Should be (¬P) ∧ Q
        expect(result.value).toEqual(And(Not(Var('P')), Var('Q')));
      }
    });

    it('parses complex formula', () => {
      const result = parseFormula('(P -> Q) /\\ (Q -> R) -> (P -> R)');
      expect(result.success).toBe(true);
      if (result.success) {
        // Hypothetical syllogism structure
        expect(result.value).toEqual(
          Implies(
            And(Implies(Var('P'), Var('Q')), Implies(Var('Q'), Var('R'))),
            Implies(Var('P'), Var('R'))
          )
        );
      }
    });

    it('parses UTF-8 input', () => {
      const result = parseFormula('¬P ∧ Q');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(And(Not(Var('P')), Var('Q')));
      }
    });

    it('returns error for empty input', () => {
      const result = parseFormula('');
      expect(result.success).toBe(false);
    });

    it('returns error for unmatched open paren', () => {
      const result = parseFormula('(P');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain(')');
      }
    });

    it('returns error for unmatched close paren', () => {
      const result = parseFormula('P)');
      expect(result.success).toBe(false);
    });

    it('returns error for missing operand', () => {
      const result = parseFormula('P /\\');
      expect(result.success).toBe(false);
    });
  });

  describe('parse (throwing version)', () => {
    it('returns formula on success', () => {
      const formula = parse('P -> Q');
      expect(formula).toEqual(Implies(Var('P'), Var('Q')));
    });

    it('throws on parse error', () => {
      expect(() => parse('P ->')).toThrow();
    });
  });

  describe('formulaEquals', () => {
    it('returns true for identical formulas', () => {
      const f1 = And(Var('P'), Var('Q'));
      const f2 = And(Var('P'), Var('Q'));
      expect(formulaEquals(f1, f2)).toBe(true);
    });

    it('returns false for different formulas', () => {
      const f1 = And(Var('P'), Var('Q'));
      const f2 = And(Var('Q'), Var('P'));
      expect(formulaEquals(f1, f2)).toBe(false);
    });

    it('returns false for different kinds', () => {
      const f1 = And(Var('P'), Var('Q'));
      const f2 = Or(Var('P'), Var('Q'));
      expect(formulaEquals(f1, f2)).toBe(false);
    });

    it('handles nested formulas', () => {
      const f1 = Implies(And(Var('P'), Var('Q')), Var('R'));
      const f2 = Implies(And(Var('P'), Var('Q')), Var('R'));
      expect(formulaEquals(f1, f2)).toBe(true);
    });
  });

  describe('extractVariables', () => {
    it('extracts single variable', () => {
      expect(extractVariables(Var('P'))).toEqual(['P']);
    });

    it('extracts multiple variables sorted', () => {
      const formula = And(Var('Q'), Var('P'));
      expect(extractVariables(formula)).toEqual(['P', 'Q']);
    });

    it('returns unique variables', () => {
      const formula = And(Var('P'), Var('P'));
      expect(extractVariables(formula)).toEqual(['P']);
    });

    it('handles nested formulas', () => {
      const formula = Implies(And(Var('A'), Var('B')), Or(Var('C'), Var('A')));
      expect(extractVariables(formula)).toEqual(['A', 'B', 'C']);
    });

    it('returns empty for bottom', () => {
      expect(extractVariables(Bottom)).toEqual([]);
    });
  });
});

describe('Printer', () => {
  describe('printFormula', () => {
    it('prints variable', () => {
      expect(printFormula(Var('P'))).toBe('P');
    });

    it('prints bottom in UTF-8', () => {
      expect(printFormula(Bottom, 'utf8')).toBe('⊥');
    });

    it('prints bottom in ASCII', () => {
      expect(printFormula(Bottom, 'ascii')).toBe('_|_');
    });

    it('prints negation in UTF-8', () => {
      expect(printFormula(Not(Var('P')), 'utf8')).toBe('¬P');
    });

    it('prints negation in ASCII', () => {
      expect(printFormula(Not(Var('P')), 'ascii')).toBe('~P');
    });

    it('prints conjunction in UTF-8', () => {
      expect(printFormula(And(Var('P'), Var('Q')), 'utf8')).toBe('P ∧ Q');
    });

    it('prints conjunction in ASCII', () => {
      expect(printFormula(And(Var('P'), Var('Q')), 'ascii')).toBe('P /\\ Q');
    });

    it('prints disjunction in UTF-8', () => {
      expect(printFormula(Or(Var('P'), Var('Q')), 'utf8')).toBe('P ∨ Q');
    });

    it('prints implication in UTF-8', () => {
      expect(printFormula(Implies(Var('P'), Var('Q')), 'utf8')).toBe('P → Q');
    });

    it('prints biconditional in UTF-8', () => {
      expect(printFormula(Iff(Var('P'), Var('Q')), 'utf8')).toBe('P ↔ Q');
    });

    it('adds parens for lower precedence', () => {
      // (P ∨ Q) ∧ R needs parens around the OR
      const formula = And(Or(Var('P'), Var('Q')), Var('R'));
      expect(printFormula(formula, 'utf8')).toBe('(P ∨ Q) ∧ R');
    });

    it('omits parens for higher precedence', () => {
      // P ∨ Q ∧ R - no parens needed since AND binds tighter
      const formula = Or(Var('P'), And(Var('Q'), Var('R')));
      expect(printFormula(formula, 'utf8')).toBe('P ∨ Q ∧ R');
    });

    it('handles left-associativity without extra parens', () => {
      const formula = And(And(Var('P'), Var('Q')), Var('R'));
      expect(printFormula(formula, 'utf8')).toBe('P ∧ Q ∧ R');
    });

    it('handles right-associativity of implies', () => {
      // P → Q → R should print without parens
      const formula = Implies(Var('P'), Implies(Var('Q'), Var('R')));
      expect(printFormula(formula, 'utf8')).toBe('P → Q → R');
    });

    it('adds parens for left-associative implies grouping', () => {
      // (P → Q) → R needs parens
      const formula = Implies(Implies(Var('P'), Var('Q')), Var('R'));
      expect(printFormula(formula, 'utf8')).toBe('(P → Q) → R');
    });

    it('roundtrips through parse and print', () => {
      const input = '(P -> Q) /\\ (Q -> R) -> (P -> R)';
      const formula = parse(input);
      const output = printFormula(formula, 'ascii');
      const reparsed = parse(output);
      expect(formulaEquals(formula, reparsed)).toBe(true);
    });
  });

  describe('printSequent', () => {
    it('prints sequent with premises', () => {
      const premises = [Var('P'), Implies(Var('P'), Var('Q'))];
      const conclusion = Var('Q');
      expect(printSequent(premises, conclusion, 'utf8')).toBe('P, P → Q ⊢ Q');
    });

    it('prints sequent without premises', () => {
      const conclusion = Implies(Var('P'), Var('P'));
      expect(printSequent([], conclusion, 'utf8')).toBe('⊢ P → P');
    });

    it('prints sequent in ASCII', () => {
      const premises = [Var('P')];
      const conclusion = Var('P');
      expect(printSequent(premises, conclusion, 'ascii')).toBe('P |- P');
    });
  });
});
