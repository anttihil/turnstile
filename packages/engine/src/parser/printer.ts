import type { Formula, DisplayMode } from '../types.js';

/**
 * Operator symbols for different display modes.
 */
const SYMBOLS = {
  ascii: {
    and: ' /\\ ',
    or: ' \\/ ',
    implies: ' -> ',
    iff: ' <-> ',
    not: '~',
    bottom: '_|_',
  },
  utf8: {
    and: ' ∧ ',
    or: ' ∨ ',
    implies: ' → ',
    iff: ' ↔ ',
    not: '¬',
    bottom: '⊥',
  },
} as const;

/**
 * Operator precedence for determining when parentheses are needed.
 * Higher number = higher precedence (binds tighter).
 */
const PRECEDENCE = {
  iff: 1,
  implies: 2,
  or: 3,
  and: 4,
  not: 5,
  var: 6,
  bottom: 6,
} as const;

/**
 * Print a formula to a string.
 */
export function printFormula(formula: Formula, mode: DisplayMode = 'utf8'): string {
  return print(formula, mode, 0);
}

/**
 * Print a formula with minimal parentheses.
 */
function print(formula: Formula, mode: DisplayMode, parentPrecedence: number): string {
  const symbols = SYMBOLS[mode];
  const myPrecedence = PRECEDENCE[formula.kind];

  let result: string;

  switch (formula.kind) {
    case 'var':
      result = formula.name;
      break;

    case 'bottom':
      result = symbols.bottom;
      break;

    case 'not':
      // Not is prefix, always binds tighter than what comes after
      result = symbols.not + print(formula.operand, mode, PRECEDENCE.not);
      break;

    case 'and':
      result =
        print(formula.left, mode, myPrecedence) +
        symbols.and +
        print(formula.right, mode, myPrecedence + 0.1); // +0.1 for left-associativity
      break;

    case 'or':
      result =
        print(formula.left, mode, myPrecedence) +
        symbols.or +
        print(formula.right, mode, myPrecedence + 0.1);
      break;

    case 'implies':
      // Right-associative: don't add parens on the right
      result =
        print(formula.left, mode, myPrecedence + 0.1) +
        symbols.implies +
        print(formula.right, mode, myPrecedence);
      break;

    case 'iff':
      result =
        print(formula.left, mode, myPrecedence) +
        symbols.iff +
        print(formula.right, mode, myPrecedence + 0.1);
      break;
  }

  // Add parentheses if this expression has lower precedence than parent
  if (myPrecedence < parentPrecedence) {
    return '(' + result + ')';
  }

  return result;
}

/**
 * Print formula in ASCII mode (convenience).
 */
export function printAscii(formula: Formula): string {
  return printFormula(formula, 'ascii');
}

/**
 * Print formula in UTF-8 mode (convenience).
 */
export function printUtf8(formula: Formula): string {
  return printFormula(formula, 'utf8');
}

/**
 * Format premises and conclusion in sequent style: P1, P2, ... ⊢ C
 */
export function printSequent(
  premises: Formula[],
  conclusion: Formula,
  mode: DisplayMode = 'utf8'
): string {
  const turnstile = mode === 'utf8' ? '⊢' : '|-';
  const premisesStr = premises.map((p) => printFormula(p, mode)).join(', ');
  const conclusionStr = printFormula(conclusion, mode);

  if (premises.length === 0) {
    return `${turnstile} ${conclusionStr}`;
  }

  return `${premisesStr} ${turnstile} ${conclusionStr}`;
}
