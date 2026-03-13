import type { Token } from '../types.js';

/**
 * Lexer for propositional logic formulas.
 * Supports both ASCII and UTF-8 input.
 */
export class Lexer {
  private input: string;
  private position: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the entire input string.
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (true) {
      const token = this.nextToken();
      tokens.push(token);
      if (token.type === 'EOF') break;
    }
    return tokens;
  }

  /**
   * Get the next token from the input.
   */
  nextToken(): Token {
    this.skipWhitespace();

    if (this.position >= this.input.length) {
      return { type: 'EOF', value: '', position: this.position };
    }

    const startPos = this.position;
    const char = this.input[this.position]!;

    // Parentheses
    if (char === '(') {
      this.position++;
      return { type: 'LPAREN', value: '(', position: startPos };
    }
    if (char === ')') {
      this.position++;
      return { type: 'RPAREN', value: ')', position: startPos };
    }

    // Prefix table: longest match wins
    //   ASCII:  <->   ->   _|_   ~   &
    //   UTF-8:  ↔     →    ⊥     ¬   ∧   ∨
    const prefixes: [string, Token['type']][] = [
      ['<->', 'IFF'],
      ['->', 'IMPLIES'],
      ['_|_', 'BOTTOM'],
      ['~', 'NOT'],
      ['¬', 'NOT'],
      ['&', 'AND'],
      ['∧', 'AND'],
      ['∨', 'OR'],
      ['↔', 'IFF'],
      ['→', 'IMPLIES'],
      ['⊥', 'BOTTOM'],
    ];

    for (const [prefix, type] of prefixes) {
      if (this.input.startsWith(prefix, this.position)) {
        this.position += prefix.length;
        return { type, value: prefix, position: startPos };
      }
    }

    // Alpha word → keyword switch or VAR
    if (this.isAlpha(char)) {
      let value = '';
      while (this.position < this.input.length && this.isAlphaNumeric(this.input[this.position]!)) {
        value += this.input[this.position];
        this.position++;
      }
      // English keywords (case-sensitive, lowercase)
      switch (value) {
        case 'not': return { type: 'NOT', value, position: startPos };
        case 'and': return { type: 'AND', value, position: startPos };
        case 'or':
        case 'v': return { type: 'OR', value, position: startPos };
        case 'implies': return { type: 'IMPLIES', value, position: startPos };
        case 'iff': return { type: 'IFF', value, position: startPos };
      }
      return { type: 'VAR', value, position: startPos };
    }

    // Unknown character - return as VAR to let parser handle error
    this.position++;
    return { type: 'VAR', value: char, position: startPos };
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position]!)) {
      this.position++;
    }
  }

  private isAlpha(char: string): boolean {
    return /[A-Za-z]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return /[A-Za-z0-9]/.test(char);
  }
}

/**
 * Tokenize a formula string.
 */
export function tokenize(input: string): Token[] {
  return new Lexer(input).tokenize();
}
