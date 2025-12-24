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

    // Single character tokens
    if (char === '(') {
      this.position++;
      return { type: 'LPAREN', value: '(', position: startPos };
    }
    if (char === ')') {
      this.position++;
      return { type: 'RPAREN', value: ')', position: startPos };
    }

    // NOT: ~ or ¬
    if (char === '~' || char === '¬') {
      this.position++;
      return { type: 'NOT', value: char, position: startPos };
    }

    // AND: /\ or & or ∧
    if (char === '&' || char === '∧') {
      this.position++;
      return { type: 'AND', value: char, position: startPos };
    }
    if (char === '/' && this.peek(1) === '\\') {
      this.position += 2;
      return { type: 'AND', value: '/\\', position: startPos };
    }

    // OR: \/ or | or ∨
    if (char === '∨') {
      this.position++;
      return { type: 'OR', value: char, position: startPos };
    }
    if (char === '|') {
      this.position++;
      return { type: 'OR', value: '|', position: startPos };
    }
    if (char === '\\' && this.peek(1) === '/') {
      this.position += 2;
      return { type: 'OR', value: '\\/', position: startPos };
    }

    // IFF: <-> or ↔
    if (char === '↔') {
      this.position++;
      return { type: 'IFF', value: char, position: startPos };
    }
    if (char === '<' && this.peek(1) === '-' && this.peek(2) === '>') {
      this.position += 3;
      return { type: 'IFF', value: '<->', position: startPos };
    }

    // IMPLIES: -> or →
    if (char === '→') {
      this.position++;
      return { type: 'IMPLIES', value: char, position: startPos };
    }
    if (char === '-' && this.peek(1) === '>') {
      this.position += 2;
      return { type: 'IMPLIES', value: '->', position: startPos };
    }

    // BOTTOM: _|_ or ⊥
    if (char === '⊥') {
      this.position++;
      return { type: 'BOTTOM', value: char, position: startPos };
    }
    if (char === '_' && this.peek(1) === '|' && this.peek(2) === '_') {
      this.position += 3;
      return { type: 'BOTTOM', value: '_|_', position: startPos };
    }

    // Variable: [A-Za-z][A-Za-z0-9]*
    if (this.isAlpha(char)) {
      let value = '';
      while (this.position < this.input.length && this.isAlphaNumeric(this.input[this.position]!)) {
        value += this.input[this.position];
        this.position++;
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

  private peek(offset: number): string | undefined {
    return this.input[this.position + offset];
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
