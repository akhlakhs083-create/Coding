/**
 * Safe Expression Evaluator for HindiScript
 * Evaluates arithmetic, string, logical, and comparison expressions without using eval() or Function().
 */

import { normalizeHindiNumerals, isValidIdentifier, KEYWORDS } from './tokens';

export type VariableScope = Record<string, any>;

export class EvaluatorError extends Error {
  line?: number;
  constructor(message: string, line?: number) {
    super(message);
    this.name = 'EvaluatorError';
    this.line = line;
  }
}

// Token types for expression lexer
type ExprTokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

interface ExprToken {
  type: ExprTokenType;
  value: any;
  raw: string;
}

export class SafeEvaluator {
  private scope: VariableScope;
  private lineNum: number;

  constructor(scope: VariableScope = {}, lineNum: number = 1) {
    this.scope = scope;
    this.lineNum = lineNum;
  }

  public setScope(scope: VariableScope) {
    this.scope = scope;
  }

  public setLine(line: number) {
    this.lineNum = line;
  }

  /**
   * Pre-processes Hindi mathematical phrase expressions if present:
   * E.g. "जोड़ो 10 और 20" -> "(10 + 20)"
   * E.g. "घटाओ 30 में से 10" -> "(30 - 10)"
   * E.g. "गुणा 5 और 6" -> "(5 * 6)"
   * E.g. "भाग 20 में 4 का" -> "(20 / 4)"
   */
  private preprocessHindiMath(expr: string): string {
    let s = expr.trim();

    // Check for "जोड़ो X और Y"
    const addRegex = /^जोड़ो\s+(.+?)\s+(?:और|तथा)\s+(.+)$/i;
    const addMatch = s.match(addRegex);
    if (addMatch) {
      return `(${this.preprocessHindiMath(addMatch[1])} + ${this.preprocessHindiMath(addMatch[2])})`;
    }

    // Check for "घटाओ X में से Y" or "घटाओ X और Y"
    const subRegex = /^घटाओ\s+(.+?)\s+(?:में\s*से|और)\s+(.+)$/i;
    const subMatch = s.match(subRegex);
    if (subMatch) {
      return `(${this.preprocessHindiMath(subMatch[1])} - ${this.preprocessHindiMath(subMatch[2])})`;
    }

    // Check for "गुणा X और Y"
    const mulRegex = /^गुणा\s+(.+?)\s+(?:और|तथा|को)\s+(.+)$/i;
    const mulMatch = s.match(mulRegex);
    if (mulMatch) {
      return `(${this.preprocessHindiMath(mulMatch[1])} * ${this.preprocessHindiMath(mulMatch[2])})`;
    }

    // Check for "भाग X में Y का" or "भाग X और Y" or "भाग X को Y से"
    const divRegex = /^भाग\s+(.+?)\s+(?:में\s*(.+?)\s*का|को\s*(.+?)\s*से|और\s*(.+))$/i;
    const divMatch = s.match(divRegex);
    if (divMatch) {
      const a = divMatch[1];
      const b = divMatch[2] || divMatch[3] || divMatch[4];
      return `(${this.preprocessHindiMath(a)} / ${this.preprocessHindiMath(b)})`;
    }

    return s;
  }

  /**
   * Tokenize expression string into tokens
   */
  private tokenize(rawExpr: string): ExprToken[] {
    let expr = normalizeHindiNumerals(rawExpr.trim());
    expr = this.preprocessHindiMath(expr);

    const tokens: ExprToken[] = [];
    let i = 0;

    while (i < expr.length) {
      const ch = expr[i];

      // Whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // String literal: "..." or '...'
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let strVal = '';
        i++;
        let closed = false;
        while (i < expr.length) {
          if (expr[i] === '\\') {
            i++;
            if (i < expr.length) {
              if (expr[i] === 'n') strVal += '\n';
              else if (expr[i] === 't') strVal += '\t';
              else strVal += expr[i];
              i++;
            }
          } else if (expr[i] === quote) {
            closed = true;
            i++;
            break;
          } else {
            strVal += expr[i];
            i++;
          }
        }
        if (!closed) {
          throw new EvaluatorError(`पंक्ति ${this.lineNum} पर त्रुटि: उद्धरण चिह्न (string quote) बंद नहीं किया गया है।`, this.lineNum);
        }
        tokens.push({ type: 'STRING', value: strVal, raw: strVal });
        continue;
      }

      // Check multi-word operators first
      const remaining = expr.slice(i);
      
      // "बड़ा या बराबर" or "बड़ा या बराबर"
      if (remaining.startsWith('बड़ा या बराबर') || remaining.startsWith('बड़ा या बराबर')) {
        tokens.push({ type: 'OPERATOR', value: '>=', raw: '>=' });
        i += remaining.startsWith('बड़ा या बराबर') ? 'बड़ा या बराबर'.length : 'बड़ा या बराबर'.length;
        continue;
      }
      // "छोटा या बराबर"
      if (remaining.startsWith('छोटा या बराबर')) {
        tokens.push({ type: 'OPERATOR', value: '<=', raw: '<=' });
        i += 'छोटा या बराबर'.length;
        continue;
      }
      // "बराबर नहीं" or "समान नहीं"
      if (remaining.startsWith('बराबर नहीं') || remaining.startsWith('समान नहीं')) {
        tokens.push({ type: 'OPERATOR', value: '!=', raw: '!=' });
        i += remaining.startsWith('बराबर नहीं') ? 'बराबर नहीं'.length : 'समान नहीं'.length;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
        let numStr = '';
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          numStr += expr[i];
          i++;
        }
        const numVal = parseFloat(numStr);
        if (isNaN(numVal)) {
          throw new EvaluatorError(`पंक्ति ${this.lineNum} पर त्रुटि: अमान्य संख्या '${numStr}'।`, this.lineNum);
        }
        tokens.push({ type: 'NUMBER', value: numVal, raw: numStr });
        continue;
      }

      // Two-character operators
      if (i + 1 < expr.length) {
        const twoChar = expr.slice(i, i + 2);
        if (['>=', '<=', '==', '!=', '&&', '||'].includes(twoChar)) {
          tokens.push({ type: 'OPERATOR', value: twoChar, raw: twoChar });
          i += 2;
          continue;
        }
      }

      // Single-character symbols and operators
      if (['+', '-', '*', '/', '%', '>', '<', '=', '!'].includes(ch)) {
        let op = ch;
        if (ch === '=') op = '=='; // Single '=' in expression context is equality check
        tokens.push({ type: 'OPERATOR', value: op, raw: ch });
        i++;
        continue;
      }

      if (ch === '(') {
        tokens.push({ type: 'LPAREN', value: '(', raw: '(' });
        i++;
        continue;
      }
      if (ch === ')') {
        tokens.push({ type: 'RPAREN', value: ')', raw: ')' });
        i++;
        continue;
      }
      if (ch === ',') {
        tokens.push({ type: 'COMMA', value: ',', raw: ',' });
        i++;
        continue;
      }

      // Identifiers / Words (can be Hindi words, Latin words, Hindi operators like बड़ा, छोटा, और, etc.)
      let word = '';
      while (i < expr.length && !/[\s+\-*/%><=!(),'"]/.test(expr[i])) {
        word += expr[i];
        i++;
      }

      if (word.length > 0) {
        // Check if word is a Hindi operator
        if (word === 'बड़ा' || word === 'बड़ा') {
          tokens.push({ type: 'OPERATOR', value: '>', raw: word });
        } else if (word === 'छोटा') {
          tokens.push({ type: 'OPERATOR', value: '<', raw: word });
        } else if (word === 'बराबर' || word === 'समान') {
          tokens.push({ type: 'OPERATOR', value: '==', raw: word });
        } else if (word === 'और' || word === 'तथा') {
          tokens.push({ type: 'OPERATOR', value: '&&', raw: word });
        } else if (word === 'या' || word === 'अथवा') {
          tokens.push({ type: 'OPERATOR', value: '||', raw: word });
        } else if (word === 'नहीं') {
          tokens.push({ type: 'OPERATOR', value: '!', raw: word });
        } else if (word === 'सत्य' || word === 'सही' || word === 'true') {
          tokens.push({ type: 'BOOLEAN', value: true, raw: word });
        } else if (word === 'असत्य' || word === 'गलत' || word === 'false') {
          tokens.push({ type: 'BOOLEAN', value: false, raw: word });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: word, raw: word });
        }
        continue;
      }

      throw new EvaluatorError(`पंक्ति ${this.lineNum} पर त्रुटि: अमान्य प्रतीक '${ch}'।`, this.lineNum);
    }

    tokens.push({ type: 'EOF', value: null, raw: '' });
    return tokens;
  }

  /**
   * Evaluate expression using Recursive Descent Parser
   */
  public evaluate(exprStr: string): any {
    if (!exprStr || exprStr.trim() === '') {
      return undefined;
    }

    const tokens = this.tokenize(exprStr);
    let current = 0;
    const self = this;

    function peek(): ExprToken {
      return tokens[current];
    }

    function consume(expectedType?: ExprTokenType): ExprToken {
      const token = tokens[current];
      if (expectedType && token.type !== expectedType) {
        throw new EvaluatorError(`पंक्ति ${self.lineNum} पर त्रुटि: अपेक्षित '${expectedType}', परंतु '${token.raw}' मिला।`, self.lineNum);
      }
      current++;
      return token;
    }

    // Grammar:
    // parseLogicalOr
    // parseLogicalAnd
    // parseComparison
    // parseAddSub
    // parseMulDiv
    // parseUnary
    // parsePrimary

    function parseLogicalOr(): any {
      let left = parseLogicalAnd();
      while (peek().type === 'OPERATOR' && peek().value === '||') {
        consume();
        const right = parseLogicalAnd();
        left = Boolean(left) || Boolean(right);
      }
      return left;
    }

    function parseLogicalAnd(): any {
      let left = parseComparison();
      while (peek().type === 'OPERATOR' && peek().value === '&&') {
        consume();
        const right = parseComparison();
        left = Boolean(left) && Boolean(right);
      }
      return left;
    }

    function parseComparison(): any {
      let left = parseAddSub();
      while (peek().type === 'OPERATOR' && ['>', '<', '>=', '<=', '==', '!='].includes(peek().value)) {
        const op = consume().value;
        const right = parseAddSub();
        switch (op) {
          case '>': left = left > right; break;
          case '<': left = left < right; break;
          case '>=': left = left >= right; break;
          case '<=': left = left <= right; break;
          case '==': left = left === right; break;
          case '!=': left = left !== right; break;
        }
      }
      return left;
    }

    function parseAddSub(): any {
      let left = parseMulDiv();
      while (peek().type === 'OPERATOR' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const right = parseMulDiv();
        if (op === '+') {
          // Check for string concatenation
          if (typeof left === 'string' || typeof right === 'string') {
            left = String(left ?? '') + String(right ?? '');
          } else {
            left = Number(left) + Number(right);
          }
        } else {
          left = Number(left) - Number(right);
        }
      }
      return left;
    }

    function parseMulDiv(): any {
      let left = parseUnary();
      while (peek().type === 'OPERATOR' && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
        const op = consume().value;
        const right = parseUnary();
        if (op === '*') {
          left = Number(left) * Number(right);
        } else if (op === '/') {
          if (Number(right) === 0) {
            throw new EvaluatorError(`पंक्ति ${self.lineNum} पर त्रुटि: शून्य (0) से भाग नहीं दिया जा सकता।`, self.lineNum);
          }
          left = Number(left) / Number(right);
        } else if (op === '%') {
          if (Number(right) === 0) {
            throw new EvaluatorError(`पंक्ति ${self.lineNum} पर त्रुटि: शून्य (0) से शेषफल (%) नहीं निकाला जा सकता।`, self.lineNum);
          }
          left = Number(left) % Number(right);
        }
      }
      return left;
    }

    function parseUnary(): any {
      if (peek().type === 'OPERATOR' && (peek().value === '-' || peek().value === '!')) {
        const op = consume().value;
        const val = parseUnary();
        if (op === '-') return -Number(val);
        if (op === '!') return !Boolean(val);
      }
      return parsePrimary();
    }

    function parsePrimary(): any {
      const token = peek();

      if (token.type === 'NUMBER') {
        consume();
        return token.value;
      }

      if (token.type === 'STRING') {
        consume();
        return token.value;
      }

      if (token.type === 'BOOLEAN') {
        consume();
        return token.value;
      }

      if (token.type === 'LPAREN') {
        consume();
        const expr = parseLogicalOr();
        if (peek().type !== 'RPAREN') {
          throw new EvaluatorError(`पंक्ति ${self.lineNum} पर त्रुटि: कोष्ठक ')' बंद नहीं किया गया।`, self.lineNum);
        }
        consume();
        return expr;
      }

      if (token.type === 'IDENTIFIER') {
        const name = consume().value;

        // Check if it's a function call like वर्गमूल(16), घात(2, 3), आदि
        if (peek().type === 'LPAREN') {
          consume('LPAREN');
          const args: any[] = [];
          if (peek().type !== 'RPAREN') {
            args.push(parseLogicalOr());
            while (peek().type === 'COMMA') {
              consume('COMMA');
              args.push(parseLogicalOr());
            }
          }
          if (peek().type !== 'RPAREN') {
            throw new EvaluatorError(`पंक्ति ${self.lineNum} पर त्रुटि: फ़ंक्शन कॉल में कोष्ठक ')' बंद नहीं है।`, self.lineNum);
          }
          consume('RPAREN');

          return self.executeBuiltinFunction(name, args);
        }

        // Variable lookup
        if (Object.prototype.hasOwnProperty.call(self.scope, name)) {
          return self.scope[name];
        }

        throw new EvaluatorError(`पंक्ति ${self.lineNum} पर त्रुटि: चर (variable) '${name}' परिभाषित नहीं है। क्या आपने इसे पहले घोषित किया है?`, self.lineNum);
      }

      throw new EvaluatorError(`पंक्ति ${self.lineNum} पर त्रुटि: अप्रत्याशित अभिव्यक्ति अंश '${token.raw || token.type}'।`, self.lineNum);
    }

    const result = parseLogicalOr();

    if (peek().type !== 'EOF') {
      throw new EvaluatorError(`पंक्ति ${this.lineNum} पर त्रुटि: अभिव्यक्ति में अतिरिक्त अप्रासंगिक कोड '${peek().raw}' मिला।`, this.lineNum);
    }

    return result;
  }

  private executeBuiltinFunction(name: string, args: any[]): any {
    switch (name) {
      case 'वर्गमूल':
      case 'sqrt':
        return Math.sqrt(Number(args[0] ?? 0));
      case 'घात':
      case 'pow':
        return Math.pow(Number(args[0] ?? 0), Number(args[1] ?? 1));
      case 'न्यूनतम':
      case 'min':
        return Math.min(...args.map(Number));
      case 'अधिकतम':
      case 'max':
        return Math.max(...args.map(Number));
      case 'पूर्णांक':
      case 'round':
        return Math.round(Number(args[0] ?? 0));
      case 'लंबाई':
      case 'length':
        return String(args[0] ?? '').length;
      case 'यादृच्छिक':
      case 'random': {
        const min = Number(args[0] ?? 1);
        const max = Number(args[1] ?? 100);
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      default:
        throw new EvaluatorError(`पंक्ति ${this.lineNum} पर त्रुटि: अज्ञात फ़ंक्शन '${name}'।`, this.lineNum);
    }
  }
}
