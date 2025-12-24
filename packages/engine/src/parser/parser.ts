import type { Formula, Token, TokenType, ParseResult } from '../types.js';
import { Lexer } from './lexer.js';

/**
 * Recursive descent parser for propositional logic formulas.
 *
 * Grammar (precedence low→high):
 *   formula     → iff
 *   iff         → implies (('<->' | IFF) implies)*
 *   implies     → or (('->' | IMPLIES) or)*     // right-associative
 *   or          → and (('\\/' | '|' | OR) and)*
 *   and         → unary (('/\\' | '&' | AND) unary)*
 *   unary       → ('~' | NOT) unary | primary
 *   primary     → VAR | BOTTOM | '(' formula ')'
 */
export class Parser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parse tokens into a Formula AST.
   */
  parse(): ParseResult<Formula> {
    try {
      const formula = this.parseFormula();

      // Ensure we consumed all tokens
      if (this.current().type !== 'EOF') {
        return {
          success: false,
          error: {
            message: `Unexpected token '${this.current().value}' after formula`,
            position: this.current().position,
          },
        };
      }

      return { success: true, value: formula };
    } catch (e) {
      if (e instanceof ParserError) {
        return { success: false, error: { message: e.message, position: e.position } };
      }
      throw e;
    }
  }

  private parseFormula(): Formula {
    return this.parseIff();
  }

  private parseIff(): Formula {
    let left = this.parseImplies();

    while (this.check('IFF')) {
      this.advance();
      const right = this.parseImplies();
      left = { kind: 'iff', left, right };
    }

    return left;
  }

  private parseImplies(): Formula {
    // Right-associative: collect all operands first, then build from right
    const operands: Formula[] = [this.parseOr()];

    while (this.check('IMPLIES')) {
      this.advance();
      operands.push(this.parseOr());
    }

    // Build right-associative: A -> B -> C = A -> (B -> C)
    let result = operands[operands.length - 1]!;
    for (let i = operands.length - 2; i >= 0; i--) {
      result = { kind: 'implies', left: operands[i]!, right: result };
    }

    return result;
  }

  private parseOr(): Formula {
    let left = this.parseAnd();

    while (this.check('OR')) {
      this.advance();
      const right = this.parseAnd();
      left = { kind: 'or', left, right };
    }

    return left;
  }

  private parseAnd(): Formula {
    let left = this.parseUnary();

    while (this.check('AND')) {
      this.advance();
      const right = this.parseUnary();
      left = { kind: 'and', left, right };
    }

    return left;
  }

  private parseUnary(): Formula {
    if (this.check('NOT')) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'not', operand };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): Formula {
    const token = this.current();

    if (this.check('VAR')) {
      this.advance();
      return { kind: 'var', name: token.value };
    }

    if (this.check('BOTTOM')) {
      this.advance();
      return { kind: 'bottom' };
    }

    if (this.check('LPAREN')) {
      this.advance();
      const formula = this.parseFormula();

      if (!this.check('RPAREN')) {
        throw new ParserError(
          `Expected ')' but found '${this.current().value}'`,
          this.current().position
        );
      }
      this.advance();

      return formula;
    }

    throw new ParserError(
      `Expected variable, '⊥', or '(' but found '${token.value}'`,
      token.position
    );
  }

  private current(): Token {
    return this.tokens[this.position] ?? { type: 'EOF', value: '', position: this.tokens.length };
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private advance(): Token {
    const token = this.current();
    if (token.type !== 'EOF') {
      this.position++;
    }
    return token;
  }
}

class ParserError extends Error {
  constructor(message: string, public position: number) {
    super(message);
    this.name = 'ParserError';
  }
}

/**
 * Parse a formula string into an AST.
 */
export function parseFormula(input: string): ParseResult<Formula> {
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Parse a formula string, throwing on error.
 */
export function parse(input: string): Formula {
  const result = parseFormula(input);
  if (!result.success) {
    throw new Error(`Parse error at position ${result.error.position}: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Check if two formulas are structurally equal.
 */
export function formulaEquals(a: Formula, b: Formula): boolean {
  if (a.kind !== b.kind) return false;

  switch (a.kind) {
    case 'var':
      return a.name === (b as typeof a).name;
    case 'bottom':
      return true;
    case 'not':
      return formulaEquals(a.operand, (b as typeof a).operand);
    case 'and':
    case 'or':
    case 'implies':
    case 'iff':
      return (
        formulaEquals(a.left, (b as typeof a).left) &&
        formulaEquals(a.right, (b as typeof a).right)
      );
  }
}

/**
 * Extract all variable names from a formula.
 */
export function extractVariables(formula: Formula): string[] {
  const vars = new Set<string>();

  function collect(f: Formula): void {
    switch (f.kind) {
      case 'var':
        vars.add(f.name);
        break;
      case 'bottom':
        break;
      case 'not':
        collect(f.operand);
        break;
      case 'and':
      case 'or':
      case 'implies':
      case 'iff':
        collect(f.left);
        collect(f.right);
        break;
    }
  }

  collect(formula);
  return Array.from(vars).sort();
}
