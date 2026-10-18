/**
 * HindiScript Interpreter
 * Parses and executes Hindi language commands line by line safely.
 * Includes Hindi error reporting with line numbers, interactive input handling,
 * V1.3 UI styling, and V1.4 Multi-Screen App Creation (स्क्रीन, खोलो, वापस, नेविगेशन बटन).
 */

import { SafeEvaluator, EvaluatorError, VariableScope } from './evaluator';
import { normalizeHindiNumerals, isValidIdentifier, KEYWORDS } from './tokens';
import { safeStorage } from './storage';

export interface ConsoleOutputMessage {
  id: string;
  type: 'stdout' | 'stderr' | 'info' | 'system' | 'input-prompt' | 'input-echo';
  text: string;
  line?: number;
  timestamp: Date;
}

export interface AppPreviewElement {
  id: string;
  type: 'text' | 'button' | 'input' | 'nav_button';
  content: string;
  buttonKey?: string;
  targetScreen?: string;
  varName?: string;
  inputValue?: string;
  expr?: string;
  line: number;
  textColor?: string;
  fontSize?: number;
  buttonColor?: string;
}

export interface AppScreenState {
  name: string;
  title: string;
  titleFontSize?: number;
  bgColor?: string;
  elements: AppPreviewElement[];
  buttonHandlers: Map<string, ASTNode[]>;
}

export interface AppPreviewState {
  title: string;
  elements: AppPreviewElement[];
  toastMessage?: string | null;
  lastActionTime?: Date | null;
  hasAppUi: boolean;
  bgColor?: string;
  titleFontSize?: number;
  // Multi-Screen (V1.4)
  screens: Record<string, AppScreenState>;
  activeScreen: string;
  screenHistory: string[];
}

export interface InterpreterCallbacks {
  onOutput: (msg: ConsoleOutputMessage) => void;
  onPromptInput: (promptText: string, varName: string) => Promise<string>;
  onAppPreviewUpdate?: (preview: AppPreviewState) => void;
  onFinish?: (success: boolean) => void;
}

// AST Node Types
export type ASTNode =
  | { type: 'PRINT'; line: number; expr: string }
  | { type: 'VAR_ASSIGN'; line: number; name: string; expr: string }
  | { type: 'MATH_CMD'; line: number; op: 'ADD' | 'SUB' | 'MUL' | 'DIV'; aExpr: string; bExpr: string; rawText: string }
  | { type: 'IF'; line: number; condition: string; thenBranch: ASTNode[]; elseIfBranches: { condition: string; body: ASTNode[]; line: number }[]; elseBranch?: ASTNode[] }
  | { type: 'REPEAT'; line: number; countExpr: string; body: ASTNode[] }
  | { type: 'WHILE'; line: number; condition: string; body: ASTNode[] }
  | { type: 'INPUT'; line: number; promptText: string; varName: string }
  | { type: 'BREAK'; line: number }
  | { type: 'CONTINUE'; line: number }
  // UI Interactive App Nodes (V1.1, V1.2 & V1.3)
  | { type: 'UI_TITLE'; line: number; expr: string }
  | { type: 'UI_TEXT'; line: number; expr: string }
  | { type: 'UI_BUTTON'; line: number; labelExpr: string }
  | { type: 'UI_INPUT'; line: number; placeholderExpr: string; varName: string }
  | { type: 'UI_ON_BUTTON'; line: number; buttonLabel?: string; body: ASTNode[] }
  // UI Styling Nodes (V1.3)
  | { type: 'STYLE_BG'; line: number; expr: string }
  | { type: 'STYLE_COLOR'; line: number; expr: string }
  | { type: 'STYLE_BUTTON_COLOR'; line: number; expr: string }
  | { type: 'STYLE_FONT_SIZE'; line: number; expr: string }
  | { type: 'STYLE_TITLE_FONT_SIZE'; line: number; expr: string }
  // Multi-Screen App Nodes (V1.4)
  | { type: 'UI_SCREEN'; line: number; expr: string }
  | { type: 'UI_NAVIGATE'; line: number; expr: string }
  | { type: 'UI_NAV_BACK'; line: number }
  | { type: 'UI_NAV_BUTTON'; line: number; labelExpr: string; targetExpr: string }
  // Persistent Data Nodes (V1.5)
  | { type: 'DATA_SAVE'; line: number; keyExpr: string; valExpr: string }
  | { type: 'DATA_LOAD'; line: number; keyExpr: string; varName: string }
  | { type: 'DATA_DELETE'; line: number; keyExpr: string };

export class HindiInterpreter {
  private scope: VariableScope = {};
  private evaluator: SafeEvaluator;
  private isCancelled = false;
  private operationCount = 0;
  private maxOperations = 25000;

  // Multi-Screen App State (V1.4)
  private screens: Record<string, AppScreenState> = {};
  private activeScreenName: string = 'मुख्य';
  private currentDefinitionScreen: string = 'मुख्य';
  private screenHistory: string[] = [];
  private hasExplicitScreens = false;

  // App Preview State
  private appPreview: AppPreviewState = {
    title: 'मेरा ऐप',
    elements: [],
    toastMessage: null,
    lastActionTime: null,
    hasAppUi: false,
    bgColor: undefined,
    titleFontSize: undefined,
    screens: {},
    activeScreen: 'मुख्य',
    screenHistory: []
  };

  private lastDeclaredButtonLabel: string = '';

  // Current cascaded styling values for subsequent elements
  private currentTextColor: string | undefined = undefined;
  private currentFontSize: number | undefined = undefined;
  private currentButtonColor: string | undefined = undefined;

  constructor() {
    this.evaluator = new SafeEvaluator(this.scope);
  }

  public stop() {
    this.isCancelled = true;
  }

  public resetScope() {
    this.scope = {};
    this.evaluator.setScope(this.scope);
  }

  public getScope(): VariableScope {
    return { ...this.scope };
  }

  public getAppPreview(): AppPreviewState {
    this.syncAppPreview();
    return {
      ...this.appPreview,
      elements: [...this.appPreview.elements],
      screens: { ...this.screens },
      screenHistory: [...this.screenHistory]
    };
  }

  private ensureScreen(screenName: string): AppScreenState {
    if (!this.screens[screenName]) {
      this.screens[screenName] = {
        name: screenName,
        title: screenName === 'मुख्य' ? 'मेरा ऐप' : screenName,
        elements: [],
        buttonHandlers: new Map()
      };
    }
    return this.screens[screenName];
  }

  private syncAppPreview(): void {
    const currentScr = this.screens[this.activeScreenName] || Object.values(this.screens)[0] || this.ensureScreen('मुख्य');
    this.appPreview.title = currentScr.title;
    this.appPreview.elements = currentScr.elements;
    this.appPreview.bgColor = currentScr.bgColor;
    this.appPreview.titleFontSize = currentScr.titleFontSize;
    this.appPreview.activeScreen = currentScr.name;
    this.appPreview.screenHistory = [...this.screenHistory];
    this.appPreview.screens = { ...this.screens };
  }

  /**
   * Validate and normalize a color string.
   */
  public validateColor(colorVal: any, lineNum: number, commandName: string): string {
    if (typeof colorVal !== 'string') {
      throw new EvaluatorError(
        `पंक्ति ${lineNum} पर त्रुटि: '${commandName}' के लिए रंग स्ट्रिंग मान (उदा. '#101827' या '#FF8800') होना चाहिए।`,
        lineNum
      );
    }
    const trimmed = colorVal.trim();

    const hindiColorMap: Record<string, string> = {
      'लाल': '#EF4444',
      'नीला': '#3B82F6',
      'हरा': '#10B981',
      'काला': '#000000',
      'सफेद': '#FFFFFF',
      'सफ़ेद': '#FFFFFF',
      'पीला': '#FBBF24',
      'नारंगी': '#F97316',
      'गुलाबी': '#EC4899',
      'बैंगनी': '#8B5CF6'
    };
    if (hindiColorMap[trimmed]) {
      return hindiColorMap[trimmed];
    }

    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
    const namedColors = [
      'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
      'pink', 'gray', 'grey', 'cyan', 'teal', 'navy', 'amber', 'emerald',
      'violet', 'indigo', 'slate', 'zinc', 'neutral', 'stone', 'rose', 'lime',
      'fuchsia', 'sky', 'transparent'
    ];

    if (hexRegex.test(trimmed)) {
      return trimmed;
    }

    if (namedColors.includes(trimmed.toLowerCase())) {
      return trimmed.toLowerCase();
    }

    throw new EvaluatorError(
      `पंक्ति ${lineNum} पर त्रुटि: '${commandName}' के लिए अमान्य रंग कोड '${trimmed}'। कृपया वैध हेक्स कोड (जैसे '#101827', '#FFFFFF', '#FF8800') उपयोग करें।`,
      lineNum
    );
  }

  /**
   * Validate font size in pixels. Safe range 10-48 pixels.
   */
  public validateFontSize(sizeVal: any, lineNum: number, commandName: string): number {
    const num = Number(normalizeHindiNumerals(String(sizeVal).trim()));
    if (isNaN(num) || !Number.isFinite(num) || num < 10 || num > 48) {
      throw new EvaluatorError(
        `पंक्ति ${lineNum} पर त्रुटि: '${commandName}' के लिए अमान्य आकार '${sizeVal}'। फ़ॉन्ट आकार 10 से 48 पिक्सेल के बीच होना चाहिए।`,
        lineNum
      );
    }
    return Math.round(num);
  }

  /**
   * Pre-parse source lines into a list of cleaned, numbered lines
   */
  private prepareLines(code: string): { text: string; lineNum: number }[] {
    const rawLines = code.split('\n');
    const result: { text: string; lineNum: number }[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i].trim();
      const lineNum = i + 1;

      if (line.startsWith('//') || line.startsWith('#')) {
        continue;
      }
      const inlineCommentIndex = line.indexOf('//');
      if (inlineCommentIndex !== -1) {
        const before = line.slice(0, inlineCommentIndex);
        const quoteCount = (before.match(/"/g) || []).length + (before.match(/'/g) || []).length;
        if (quoteCount % 2 === 0) {
          line = before.trim();
        }
      }

      if (line.length > 0) {
        result.push({ text: line, lineNum });
      }
    }

    return result;
  }

  /**
   * Parse statements into an AST tree
   */
  private parseBlock(lines: { text: string; lineNum: number }[], startIndex: number, stopAt: string[]): { nodes: ASTNode[]; nextIndex: number } {
    const nodes: ASTNode[] = [];
    let i = startIndex;

    while (i < lines.length) {
      const { text, lineNum } = lines[i];

      const firstWord = text.split(/\s+/)[0];
      const normalizedFirstWord = firstWord.replace(/[।;]$/, '');

      if (stopAt.includes('समाप्त') && KEYWORDS.END.includes(normalizedFirstWord)) {
        return { nodes, nextIndex: i };
      }
      if (stopAt.includes('वरना अगर') && text.startsWith('वरना अगर')) {
        return { nodes, nextIndex: i };
      }
      if (stopAt.includes('वरना') && (text === 'वरना' || text.startsWith('वरना '))) {
        return { nodes, nextIndex: i };
      }

      // 1. MULTI-SCREEN COMMAND: "स्क्रीन <name>" (V1.4)
      if (normalizedFirstWord === KEYWORDS.SCREEN) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'स्क्रीन' के बाद स्क्रीन का नाम लिखें। उदाहरण: स्क्रीन "होम"`, lineNum);
        }
        nodes.push({ type: 'UI_SCREEN', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 2. MULTI-SCREEN COMMAND: "खोलो <target>" (V1.4)
      if (normalizedFirstWord === KEYWORDS.NAVIGATE) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'खोलो' के बाद लक्षित स्क्रीन का नाम लिखें। उदाहरण: खोलो "प्रोफाइल"`, lineNum);
        }
        nodes.push({ type: 'UI_NAVIGATE', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 3. MULTI-SCREEN COMMAND: "वापस" (V1.4)
      if (normalizedFirstWord === KEYWORDS.NAV_BACK) {
        nodes.push({ type: 'UI_NAV_BACK', line: lineNum });
        i++;
        continue;
      }

      // 4. MULTI-SCREEN COMMAND: "नेविगेशन बटन <label> <target>" (V1.4)
      const isNavBtn = Array.isArray(KEYWORDS.NAV_BUTTON)
        ? KEYWORDS.NAV_BUTTON.some(k => text.startsWith(k))
        : text.startsWith(KEYWORDS.NAV_BUTTON);
      if (isNavBtn) {
        const prefix = Array.isArray(KEYWORDS.NAV_BUTTON)
          ? KEYWORDS.NAV_BUTTON.find(k => text.startsWith(k)) || 'नेविगेशन बटन'
          : KEYWORDS.NAV_BUTTON;
        const rest = text.slice(prefix.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'नेविगेशन बटन' का सही सिंटैक्स: नेविगेशन बटन "<बटन लेबल>" "<स्क्रीन नाम>"`, lineNum);
        }

        const matchTwo = rest.match(/^(["'].*?["'])\s+(["'].*?["'])$/);
        let labelExpr = '';
        let targetExpr = '';
        if (matchTwo) {
          labelExpr = matchTwo[1];
          targetExpr = matchTwo[2];
        } else {
          const matchOne = rest.match(/^(["'].*?["'])$/);
          if (matchOne) {
            labelExpr = matchOne[1];
            targetExpr = matchOne[1];
          } else {
            const parts = rest.split(/\s+/);
            if (parts.length >= 2) {
              labelExpr = `"${parts[0]}"`;
              targetExpr = `"${parts[1]}"`;
            } else if (parts.length === 1 && parts[0]) {
              labelExpr = `"${parts[0]}"`;
              targetExpr = `"${parts[0]}"`;
            } else {
              throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'नेविगेशन बटन' का सही सिंटैक्स: नेविगेशन बटन "<बटन लेबल>" "<स्क्रीन नाम>"`, lineNum);
            }
          }
        }

        nodes.push({ type: 'UI_NAV_BUTTON', line: lineNum, labelExpr, targetExpr });
        i++;
        continue;
      }

      // 4b. PERSISTENT DATA COMMAND: "सहेजो <कुंजी> <मान>" (V1.5)
      if (normalizedFirstWord === KEYWORDS.SAVE_DATA) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(
            `पंक्ति ${lineNum} पर त्रुटि: 'सहेजो' का सही सिंटैक्स: सहेजो "<कुंजी>" <मान या चर>. उदाहरण: सहेजो "यूज़र_नाम" नाम`,
            lineNum
          );
        }

        const match = rest.match(/^(["'].*?["'])\s+(.+)$/);
        let keyExpr = '';
        let valExpr = '';
        if (match) {
          keyExpr = match[1];
          valExpr = match[2].trim();
        } else {
          const parts = rest.split(/\s+/);
          if (parts.length >= 2) {
            keyExpr = `"${parts[0]}"`;
            valExpr = parts.slice(1).join(' ');
          } else {
            throw new EvaluatorError(
              `पंक्ति ${lineNum} पर त्रुटि: 'सहेजो' का सही सिंटैक्स: सहेजो "<कुंजी>" <मान या चर>. उदाहरण: सहेजो "यूज़र_नाम" नाम`,
              lineNum
            );
          }
        }

        nodes.push({ type: 'DATA_SAVE', line: lineNum, keyExpr, valExpr });
        i++;
        continue;
      }

      // 4c. PERSISTENT DATA COMMAND: "लोड करो <कुंजी> <चर_नाम>" (V1.5)
      const isLoadCmd = Array.isArray(KEYWORDS.LOAD_DATA)
        ? KEYWORDS.LOAD_DATA.some(k => text.startsWith(k))
        : text.startsWith(KEYWORDS.LOAD_DATA);
      if (isLoadCmd) {
        const prefix = Array.isArray(KEYWORDS.LOAD_DATA)
          ? KEYWORDS.LOAD_DATA.find(k => text.startsWith(k)) || 'लोड करो'
          : KEYWORDS.LOAD_DATA;
        const rest = text.slice(prefix.length).trim();
        if (!rest) {
          throw new EvaluatorError(
            `पंक्ति ${lineNum} पर त्रुटि: 'लोड करो' का सही सिंटैक्स: लोड करो "<कुंजी>" <चर का नाम>. उदाहरण: लोड करो "यूज़र_नाम" नाम`,
            lineNum
          );
        }

        const match = rest.match(/^(["'].*?["'])\s+([^\s]+)$/);
        let keyExpr = '';
        let varName = '';
        if (match) {
          keyExpr = match[1];
          varName = match[2].trim();
        } else {
          const parts = rest.split(/\s+/);
          if (parts.length >= 2) {
            keyExpr = `"${parts[0]}"`;
            varName = parts[1].trim();
          } else {
            throw new EvaluatorError(
              `पंक्ति ${lineNum} पर त्रुटि: 'लोड करो' का सही सिंटैक्स: लोड करो "<कुंजी>" <चर का नाम>. उदाहरण: लोड करो "यूज़र_नाम" नाम`,
              lineNum
            );
          }
        }

        if (!isValidIdentifier(varName)) {
          throw new EvaluatorError(
            `पंक्ति ${lineNum} पर त्रुटि: '${varName}' एक अमान्य चर नाम है।`,
            lineNum
          );
        }

        nodes.push({ type: 'DATA_LOAD', line: lineNum, keyExpr, varName });
        i++;
        continue;
      }

      // 4d. PERSISTENT DATA COMMAND: "हटाओ <कुंजी>" (V1.5)
      const isDeleteCmd = Array.isArray(KEYWORDS.DELETE_DATA)
        ? KEYWORDS.DELETE_DATA.includes(normalizedFirstWord)
        : normalizedFirstWord === KEYWORDS.DELETE_DATA;
      if (isDeleteCmd) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(
            `पंक्ति ${lineNum} पर त्रुटि: 'हटाओ' का सही सिंटैक्स: हटाओ "<कुंजी>". उदाहरण: हटाओ "यूज़र_नाम"`,
            lineNum
          );
        }

        let keyExpr = rest;
        if (!keyExpr.startsWith('"') && !keyExpr.startsWith("'")) {
          keyExpr = `"${keyExpr}"`;
        }

        nodes.push({ type: 'DATA_DELETE', line: lineNum, keyExpr });
        i++;
        continue;
      }

      // 5. UI COMMAND: "शीर्षक <expr>"
      if (normalizedFirstWord === KEYWORDS.APP_TITLE) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'शीर्षक' के बाद ऐप का शीर्षक लिखें। उदाहरण: शीर्षक "मेरा ऐप"`, lineNum);
        }
        nodes.push({ type: 'UI_TITLE', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 6. UI COMMAND: "पाठ <expr>"
      if (normalizedFirstWord === KEYWORDS.APP_TEXT) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'पाठ' के बाद प्रदर्शित करने के लिए संदेश लिखें। उदाहरण: पाठ "नमस्ते"`, lineNum);
        }
        nodes.push({ type: 'UI_TEXT', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 7. UI STYLING: "पृष्ठभूमि <color>" (V1.3)
      if (normalizedFirstWord === KEYWORDS.STYLE_BG) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'पृष्ठभूमि' के बाद रंग कोड लिखें। उदाहरण: पृष्ठभूमि "#101827"`, lineNum);
        }
        nodes.push({ type: 'STYLE_BG', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 8. UI STYLING: "रंग <color>" (V1.3)
      if (normalizedFirstWord === KEYWORDS.STYLE_COLOR) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'रंग' के बाद रंग कोड लिखें। उदाहरण: रंग "#FFFFFF"`, lineNum);
        }
        nodes.push({ type: 'STYLE_COLOR', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 9. UI STYLING: "बटन_रंग <color>" (V1.3)
      if (normalizedFirstWord === KEYWORDS.STYLE_BUTTON_COLOR) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'बटन_रंग' के बाद रंग कोड लिखें। उदाहरण: बटन_रंग "#FF8800"`, lineNum);
        }
        nodes.push({ type: 'STYLE_BUTTON_COLOR', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 10. UI STYLING: "आकार <size>" (V1.3)
      if (normalizedFirstWord === KEYWORDS.STYLE_FONT_SIZE) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'आकार' के बाद संख्या लिखें (10-48)। उदाहरण: आकार 24`, lineNum);
        }
        nodes.push({ type: 'STYLE_FONT_SIZE', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 11. UI STYLING: "शीर्षक_आकार <size>" (V1.3)
      if (normalizedFirstWord === KEYWORDS.STYLE_TITLE_FONT_SIZE) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'शीर्षक_आकार' के बाद संख्या लिखें (10-48)। उदाहरण: शीर्षक_आकार 28`, lineNum);
        }
        nodes.push({ type: 'STYLE_TITLE_FONT_SIZE', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 12. UI COMMAND: "इनपुट <placeholder> [varName]" (V1.2)
      if (normalizedFirstWord === KEYWORDS.APP_INPUT) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'इनपुट' के बाद फ़ील्ड का विवरण लिखें। उदाहरण: इनपुट "अपना नाम लिखें" नाम`, lineNum);
        }

        const quoteMatch = rest.match(/^(["'].*?["'])\s*(?:में\s*)?([^\s]+)?$/);
        let placeholderExpr = '';
        let boundVar = '';

        if (quoteMatch) {
          placeholderExpr = quoteMatch[1];
          boundVar = (quoteMatch[2] || '').trim();
        } else {
          const words = rest.split(/\s+/);
          boundVar = words[words.length - 1] || 'इनपुट_मान';
          placeholderExpr = `"${words.slice(0, -1).join(' ') || 'मान दर्ज करें'}"`;
        }

        if (!boundVar) {
          if (placeholderExpr.includes('नाम')) boundVar = 'नाम';
          else if (placeholderExpr.includes('संख्या1') || placeholderExpr.includes('पहली')) boundVar = 'संख्या1';
          else if (placeholderExpr.includes('संख्या2') || placeholderExpr.includes('दूसरी')) boundVar = 'संख्या2';
          else if (placeholderExpr.includes('संख्या')) boundVar = 'संख्या';
          else boundVar = 'इनपुट_मान';
        }

        nodes.push({ type: 'UI_INPUT', line: lineNum, placeholderExpr, varName: boundVar });
        i++;
        continue;
      }

      // 13. UI COMMAND: "जब बटन दबे" or "जब बटन <नाम> दबे"
      if (text.startsWith(KEYWORDS.WHEN_BUTTON) || text.startsWith('जब बटन')) {
        const quoteMatch = text.match(/["'](.*?)["']/);
        const buttonLabel = quoteMatch ? quoteMatch[1] : undefined;

        i++;
        const bodyBlock = this.parseBlock(lines, i, ['समाप्त']);
        i = bodyBlock.nextIndex;

        if (i >= lines.length || !KEYWORDS.END.includes(lines[i].text.replace(/[।;]$/, ''))) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर शुरू हुए 'जब बटन' ब्लॉक के लिए 'समाप्त' नहीं मिला। कृपया 'समाप्त' जोड़ें।`, lineNum);
        }
        i++; // skip 'समाप्त'
        nodes.push({ type: 'UI_ON_BUTTON', line: lineNum, buttonLabel, body: bodyBlock.nodes });
        continue;
      }

      // 14. UI COMMAND: "बटन <expr>"
      if (normalizedFirstWord === KEYWORDS.APP_BUTTON) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'बटन' के बाद बटन का नाम लिखें। उदाहरण: बटन "दबाएँ"`, lineNum);
        }
        nodes.push({ type: 'UI_BUTTON', line: lineNum, labelExpr: rest });
        i++;
        continue;
      }

      // 15. PRINT COMMAND: "दिखाओ <expr>"
      if (KEYWORDS.PRINT.includes(normalizedFirstWord)) {
        const rest = text.slice(firstWord.length).trim();
        if (!rest) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'दिखाओ' के बाद क्या दिखाना है, वह लिखें। उदाहरण: दिखाओ "नमस्ते दुनिया!"`, lineNum);
        }
        nodes.push({ type: 'PRINT', line: lineNum, expr: rest });
        i++;
        continue;
      }

      // 16. CONSOLE INPUT COMMAND: "पूछो "संदेश" चर"
      if (KEYWORDS.INPUT.includes(normalizedFirstWord)) {
        const rest = text.slice(firstWord.length).trim();
        const inputMatch = rest.match(/^(["'].*?["'])\s*(?:में\s*)?([^\s]+)?$/);
        if (inputMatch) {
          const promptExpr = inputMatch[1];
          const varName = (inputMatch[2] || 'उत्तर').trim();
          nodes.push({ type: 'INPUT', line: lineNum, promptText: promptExpr, varName });
        } else {
          const words = rest.split(/\s+/);
          const varName = words[words.length - 1] || 'उत्तर';
          const promptText = `"${words.slice(0, -1).join(' ') || 'मान दर्ज करें:'}"`;
          nodes.push({ type: 'INPUT', line: lineNum, promptText, varName });
        }
        i++;
        continue;
      }

      // 17. DIRECT MATH COMMANDS: "जोड़ो 10 और 20", "घटाओ 30 में से 10", "गुणा 5 और 6", "भाग 20 और 4"
      if (normalizedFirstWord === KEYWORDS.ADD_CMD) {
        const rest = text.slice(firstWord.length).trim();
        const match = rest.match(/^(.+?)\s+(?:और|तथा)\s+(.+)$/);
        if (!match) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'जोड़ो' का सही सिंटैक्स: जोड़ो <संख्या1> और <संख्या2>`, lineNum);
        }
        nodes.push({ type: 'MATH_CMD', line: lineNum, op: 'ADD', aExpr: match[1], bExpr: match[2], rawText: text });
        i++;
        continue;
      }
      if (normalizedFirstWord === KEYWORDS.SUBTRACT_CMD) {
        const rest = text.slice(firstWord.length).trim();
        const match = rest.match(/^(.+?)\s+(?:में\s*से|और)\s+(.+)$/);
        if (!match) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'घटाओ' का सही सिंटैक्स: घटाओ <संख्या1> में से <संख्या2>`, lineNum);
        }
        nodes.push({ type: 'MATH_CMD', line: lineNum, op: 'SUB', aExpr: match[1], bExpr: match[2], rawText: text });
        i++;
        continue;
      }
      if (normalizedFirstWord === KEYWORDS.MULTIPLY_CMD) {
        const rest = text.slice(firstWord.length).trim();
        const match = rest.match(/^(.+?)\s+(?:और|तथा|को)\s+(.+)$/);
        if (!match) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'गुणा' का सही सिंटैक्स: गुणा <संख्या1> और <संख्या2>`, lineNum);
        }
        nodes.push({ type: 'MATH_CMD', line: lineNum, op: 'MUL', aExpr: match[1], bExpr: match[2], rawText: text });
        i++;
        continue;
      }
      if (normalizedFirstWord === KEYWORDS.DIVIDE_CMD) {
        const rest = text.slice(firstWord.length).trim();
        const match = rest.match(/^(.+?)\s+(?:में\s*(.+?)\s*का|को\s*(.+?)\s*से|और\s*(.+))$/);
        if (!match) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'भाग' का सही सिंटैक्स: भाग <संख्या1> में <संख्या2> का अथवा भाग <संख्या1> और <संख्या2>`, lineNum);
        }
        const b = match[2] || match[3] || match[4];
        nodes.push({ type: 'MATH_CMD', line: lineNum, op: 'DIV', aExpr: match[1], bExpr: b, rawText: text });
        i++;
        continue;
      }

      // 18. VARIABLE DECLARATION / ASSIGNMENT: "मान x = 10" or "मान नाम = "अमित""
      if (KEYWORDS.VAR_DECL.includes(normalizedFirstWord)) {
        const rest = text.slice(firstWord.length).trim();
        const eqIdx = rest.indexOf('=');
        if (eqIdx === -1) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: चर घोषणा में '=' अपेक्षित है। उदाहरण: मान आयु = 18`, lineNum);
        }
        const varName = rest.slice(0, eqIdx).trim();
        const expr = rest.slice(eqIdx + 1).trim();
        if (!isValidIdentifier(varName)) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: '${varName}' एक अमान्य चर नाम है।`, lineNum);
        }
        nodes.push({ type: 'VAR_ASSIGN', line: lineNum, name: varName, expr });
        i++;
        continue;
      }

      // 19. IF BLOCK: "अगर <शर्त>"
      if (normalizedFirstWord === KEYWORDS.IF) {
        const condition = text.slice(firstWord.length).trim();
        if (!condition) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'अगर' के बाद शर्त आवश्यक है। उदाहरण: अगर 10 बड़ा 5`, lineNum);
        }

        i++;
        const thenBlock = this.parseBlock(lines, i, ['समाप्त', 'वरना अगर', 'वरना']);
        i = thenBlock.nextIndex;

        const elseIfBranches: { condition: string; body: ASTNode[]; line: number }[] = [];
        let elseBranch: ASTNode[] | undefined = undefined;

        while (i < lines.length && lines[i].text.startsWith('वरना अगर')) {
          const elseIfLineNum = lines[i].lineNum;
          const elseIfCond = lines[i].text.slice('वरना अगर'.length).trim();
          i++;
          const elseIfBlock = this.parseBlock(lines, i, ['समाप्त', 'वरना अगर', 'वरना']);
          elseIfBranches.push({ condition: elseIfCond, body: elseIfBlock.nodes, line: elseIfLineNum });
          i = elseIfBlock.nextIndex;
        }

        if (i < lines.length && (lines[i].text === 'वरना' || lines[i].text.startsWith('वरना '))) {
          i++;
          const elseBlock = this.parseBlock(lines, i, ['समाप्त']);
          elseBranch = elseBlock.nodes;
          i = elseBlock.nextIndex;
        }

        if (i >= lines.length || !KEYWORDS.END.includes(lines[i].text.replace(/[।;]$/, ''))) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर शुरू हुए 'अगर' ब्लॉक के लिए 'समाप्त' नहीं मिला। कृपया 'समाप्त' जोड़ें।`, lineNum);
        }
        i++; // skip 'समाप्त'
        nodes.push({ type: 'IF', line: lineNum, condition, thenBranch: thenBlock.nodes, elseIfBranches, elseBranch });
        continue;
      }

      // 20. REPEAT LOOP: "दोहराओ <N> बार"
      if (normalizedFirstWord === KEYWORDS.REPEAT) {
        const rest = text.slice(firstWord.length).trim();
        let countExpr = rest;
        if (countExpr.endsWith('बार')) {
          countExpr = countExpr.slice(0, -3).trim();
        }
        if (!countExpr) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'दोहराओ' के बाद दोहराव संख्या आवश्यक है। उदाहरण: दोहराओ 5 बार`, lineNum);
        }

        i++;
        const bodyBlock = this.parseBlock(lines, i, ['समाप्त']);
        i = bodyBlock.nextIndex;

        if (i >= lines.length || !KEYWORDS.END.includes(lines[i].text.replace(/[।;]$/, ''))) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर शुरू हुए 'दोहराओ' लूप के लिए 'समाप्त' नहीं मिला।`, lineNum);
        }
        i++; // skip 'समाप्त'
        nodes.push({ type: 'REPEAT', line: lineNum, countExpr, body: bodyBlock.nodes });
        continue;
      }

      // 21. WHILE LOOP: "जबतक <शर्त>"
      if (normalizedFirstWord === KEYWORDS.WHILE) {
        const condition = text.slice(firstWord.length).trim();
        if (!condition) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: 'जबतक' के बाद लूप शर्त आवश्यक है। उदाहरण: जबतक i छोटा 10`, lineNum);
        }

        i++;
        const bodyBlock = this.parseBlock(lines, i, ['समाप्त']);
        i = bodyBlock.nextIndex;

        if (i >= lines.length || !KEYWORDS.END.includes(lines[i].text.replace(/[।;]$/, ''))) {
          throw new EvaluatorError(`पंक्ति ${lineNum} पर शुरू हुए 'जबतक' लूप के लिए 'समाप्त' नहीं मिला।`, lineNum);
        }
        i++; // skip 'समाप्त'
        nodes.push({ type: 'WHILE', line: lineNum, condition, body: bodyBlock.nodes });
        continue;
      }

      // 22. LOOP CONTROL: "रुको" / "आगे"
      if (normalizedFirstWord === KEYWORDS.BREAK) {
        nodes.push({ type: 'BREAK', line: lineNum });
        i++;
        continue;
      }
      if (normalizedFirstWord === KEYWORDS.CONTINUE) {
        nodes.push({ type: 'CONTINUE', line: lineNum });
        i++;
        continue;
      }

      // 23. DIRECT REASSIGNMENT: "x = 10" or "नाम = "अमित"" or "योग = संख्या1 + संख्या2"
      const eqIdx = text.indexOf('=');
      if (eqIdx !== -1) {
        const potentialVar = text.slice(0, eqIdx).trim();
        if (!/[><!]/.test(text[eqIdx - 1] || '') && text[eqIdx + 1] !== '=') {
          if (isValidIdentifier(potentialVar)) {
            const expr = text.slice(eqIdx + 1).trim();
            nodes.push({ type: 'VAR_ASSIGN', line: lineNum, name: potentialVar, expr });
            i++;
            continue;
          }
        }
      }

      // If nothing matched, syntax error
      throw new EvaluatorError(`पंक्ति ${lineNum} पर त्रुटि: अज्ञात या अमान्य कमांड '${text}'। क्या आप 'स्क्रीन', 'खोलो', 'वापस', 'नेविगेशन बटन', 'शीर्षक', 'पाठ', 'इनपुट', 'बटन', या 'दिखाओ' लिखना चाहते थे?`, lineNum);
    }

    return { nodes, nextIndex: i };
  }

  /**
   * Execute AST nodes with callbacks for console output, app preview, and user input
   */
  public async execute(code: string, callbacks: InterpreterCallbacks): Promise<boolean> {
    this.isCancelled = false;
    this.operationCount = 0;
    this.resetScope();
    this.lastDeclaredButtonLabel = '';

    // Reset multi-screen & styles
    this.screens = {};
    this.activeScreenName = 'मुख्य';
    this.currentDefinitionScreen = 'मुख्य';
    this.screenHistory = [];
    this.hasExplicitScreens = false;

    this.currentTextColor = undefined;
    this.currentFontSize = undefined;
    this.currentButtonColor = undefined;

    this.ensureScreen('मुख्य');

    // Reset app preview
    this.appPreview = {
      title: 'मेरा ऐप',
      elements: [],
      toastMessage: null,
      lastActionTime: null,
      hasAppUi: false,
      bgColor: undefined,
      titleFontSize: undefined,
      screens: {},
      activeScreen: 'मुख्य',
      screenHistory: []
    };

    const lines = this.prepareLines(code);
    if (lines.length === 0) {
      callbacks.onOutput({
        id: crypto.randomUUID(),
        type: 'info',
        text: 'चालू करने के लिए कोई कोड नहीं मिला।',
        timestamp: new Date()
      });
      callbacks.onAppPreviewUpdate?.(this.getAppPreview());
      callbacks.onFinish?.(true);
      return true;
    }

    let ast: ASTNode[] = [];
    try {
      const parsed = this.parseBlock(lines, 0, []);
      ast = parsed.nodes;
    } catch (err: any) {
      const msg = err instanceof EvaluatorError ? err.message : `पार्स त्रुटि: ${err.message || String(err)}`;
      callbacks.onOutput({
        id: crypto.randomUUID(),
        type: 'stderr',
        text: msg,
        line: err.line,
        timestamp: new Date()
      });
      callbacks.onFinish?.(false);
      return false;
    }

    try {
      await this.executeNodes(ast, callbacks);
      if (this.isCancelled) {
        callbacks.onOutput({
          id: crypto.randomUUID(),
          type: 'info',
          text: 'प्रोग्राम निष्पादन रोक दिया गया।',
          timestamp: new Date()
        });
        callbacks.onFinish?.(false);
        return false;
      }
      callbacks.onAppPreviewUpdate?.(this.getAppPreview());
      callbacks.onFinish?.(true);
      return true;
    } catch (err: any) {
      const msg = err instanceof EvaluatorError ? err.message : `निष्पादन त्रुटि: ${err.message || String(err)}`;
      callbacks.onOutput({
        id: crypto.randomUUID(),
        type: 'stderr',
        text: msg,
        line: err.line,
        timestamp: new Date()
      });
      callbacks.onFinish?.(false);
      return false;
    }
  }

  /**
   * Navigate to a screen programmatically from the UI
   */
  public navigateToScreen(target: string, callbacks?: InterpreterCallbacks): boolean {
    if (!this.screens[target]) return false;
    if (this.activeScreenName !== target) {
      this.screenHistory.push(this.activeScreenName);
      this.activeScreenName = target;
      this.refreshTextElements();
      this.syncAppPreview();
      callbacks?.onAppPreviewUpdate?.(this.getAppPreview());
      return true;
    }
    return false;
  }

  /**
   * Return to the previous screen from the navigation history
   */
  public navigateBack(callbacks?: InterpreterCallbacks): boolean {
    if (this.screenHistory.length === 0) return false;
    const prev = this.screenHistory.pop()!;
    if (this.screens[prev]) {
      this.activeScreenName = prev;
      this.refreshTextElements();
      this.syncAppPreview();
      callbacks?.onAppPreviewUpdate?.(this.getAppPreview());
      return true;
    }
    return false;
  }

  /**
   * Update value of an input field bound to a variable in App Preview
   */
  public updateInputValue(varName: string, value: string, callbacks?: InterpreterCallbacks): void {
    for (const scr of Object.values(this.screens)) {
      const el = scr.elements.find(e => e.type === 'input' && e.varName === varName);
      if (el) {
        el.inputValue = value;
      }
    }

    const normalized = normalizeHindiNumerals(value.trim());
    let finalVal: any = value;
    if (normalized !== '' && !isNaN(Number(normalized))) {
      finalVal = Number(normalized);
    }

    this.scope[varName] = finalVal;
    this.evaluator.setScope(this.scope);

    this.refreshTextElements();
    this.syncAppPreview();
    callbacks?.onAppPreviewUpdate?.(this.getAppPreview());
  }

  /**
   * Keep input elements in App Preview synchronized when variables change in code (V1.5)
   */
  public syncVariableToInputs(varName: string, val: any): void {
    const strVal = val !== undefined && val !== null ? String(val) : '';
    for (const scr of Object.values(this.screens)) {
      for (const el of scr.elements) {
        if (el.type === 'input' && el.varName === varName) {
          el.inputValue = strVal;
        }
      }
    }
  }

  /**
   * Re-evaluates dynamic text elements based on current scope across screens
   */
  public refreshTextElements(): void {
    this.evaluator.setScope(this.scope);
    for (const scr of Object.values(this.screens)) {
      for (const el of scr.elements) {
        if (el.type === 'text' && el.expr) {
          try {
            const evaluated = this.evaluator.evaluate(el.expr);
            if (evaluated !== undefined) {
              el.content = String(evaluated);
            }
          } catch {
            // ignore temporary evaluation error during typing
          }
        }
      }
    }
  }

  /**
   * Execute action block when user clicks a button in the active App Preview panel
   */
  public async executeButtonAction(buttonLabel: string, callbacks: InterpreterCallbacks): Promise<boolean> {
    const currentScr = this.screens[this.activeScreenName] || Object.values(this.screens)[0] || this.ensureScreen('मुख्य');

    // 1. Check if clicked button is a navigation button (nav_button)
    const navBtn = currentScr.elements.find(e => e.type === 'nav_button' && (e.buttonKey === buttonLabel || e.content === buttonLabel));
    if (navBtn && navBtn.targetScreen) {
      const target = navBtn.targetScreen;
      if (!this.screens[target]) {
        const errMsg = `पंक्ति ${navBtn.line} पर त्रुटि: स्क्रीन '${target}' मौजूद नहीं है। कृपया पहले 'स्क्रीन "${target}"' परिभाषित करें।`;
        callbacks.onOutput({
          id: crypto.randomUUID(),
          type: 'stderr',
          text: errMsg,
          line: navBtn.line,
          timestamp: new Date()
        });
        return false;
      }
      this.screenHistory.push(this.activeScreenName);
      this.activeScreenName = target;
      this.appPreview.toastMessage = `स्क्रीन "${target}" खोली गई`;
      this.appPreview.lastActionTime = new Date();
      this.refreshTextElements();
      this.syncAppPreview();
      callbacks.onAppPreviewUpdate?.(this.getAppPreview());
      return true;
    }

    // 2. Custom action block handler for this button on current screen
    const handler = currentScr.buttonHandlers.get(buttonLabel) || currentScr.buttonHandlers.get('__DEFAULT__');
    if (!handler || handler.length === 0) {
      const defaultMsg = `बटन "${buttonLabel}" दबाया गया!`;
      callbacks.onOutput({
        id: crypto.randomUUID(),
        type: 'stdout',
        text: defaultMsg,
        timestamp: new Date()
      });
      this.appPreview.toastMessage = defaultMsg;
      this.appPreview.lastActionTime = new Date();
      this.syncAppPreview();
      callbacks.onAppPreviewUpdate?.(this.getAppPreview());
      return true;
    }

    this.isCancelled = false;
    this.operationCount = 0;
    this.evaluator.setScope(this.scope);
    this.appPreview.lastActionTime = new Date();

    try {
      await this.executeNodes(handler, callbacks);
      this.refreshTextElements();
      this.syncAppPreview();
      callbacks.onAppPreviewUpdate?.(this.getAppPreview());
      return true;
    } catch (err: any) {
      const msg = err instanceof EvaluatorError ? err.message : `बटन क्रिया त्रुटि: ${err.message || String(err)}`;
      callbacks.onOutput({
        id: crypto.randomUUID(),
        type: 'stderr',
        text: msg,
        line: err.line,
        timestamp: new Date()
      });
      return false;
    }
  }

  private async executeNodes(nodes: ASTNode[], callbacks: InterpreterCallbacks): Promise<'BREAK' | 'CONTINUE' | undefined> {
    for (const node of nodes) {
      if (this.isCancelled) return undefined;

      this.operationCount++;
      if (this.operationCount > this.maxOperations) {
        throw new EvaluatorError(`पंक्ति ${node.line} पर त्रुटि: प्रोग्राम ने अत्यधिक चक्र पूरे किए (संभावित अनंत लूप)। सुरक्षा हेतु रोक दिया गया।`, node.line);
      }

      this.evaluator.setLine(node.line);
      this.evaluator.setScope(this.scope);

      switch (node.type) {
        // V1.4 Multi-Screen Nodes
        case 'UI_SCREEN': {
          const evaluated = this.evaluator.evaluate(node.expr);
          const screenName = String(evaluated ?? '').trim();
          if (!screenName) {
            throw new EvaluatorError(`पंक्ति ${node.line} पर त्रुटि: 'स्क्रीन' के लिए स्क्रीन का नाम अमान्य है।`, node.line);
          }

          this.ensureScreen(screenName);
          this.currentDefinitionScreen = screenName;

          // Reset cascaded styling so each screen has isolated styling
          this.currentTextColor = undefined;
          this.currentFontSize = undefined;
          this.currentButtonColor = undefined;

          // If this is the first explicit screen defined, remove empty 'मुख्य' fallback and make this active
          if (!this.hasExplicitScreens) {
            this.hasExplicitScreens = true;
            if (this.screens['मुख्य'] && this.screens['मुख्य'].elements.length === 0 && screenName !== 'मुख्य') {
              delete this.screens['मुख्य'];
            }
            this.activeScreenName = screenName;
          }

          this.appPreview.hasAppUi = true;
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'UI_NAVIGATE': {
          const evaluated = this.evaluator.evaluate(node.expr);
          const target = String(evaluated ?? '').trim();
          if (!target || !this.screens[target]) {
            throw new EvaluatorError(
              `पंक्ति ${node.line} पर त्रुटि: स्क्रीन '${target}' मौजूद नहीं है। कृपया पहले 'स्क्रीन "${target}"' परिभाषित करें।`,
              node.line
            );
          }

          if (this.activeScreenName !== target) {
            this.screenHistory.push(this.activeScreenName);
            this.activeScreenName = target;
          }
          this.appPreview.toastMessage = `स्क्रीन "${target}" पर नेविगेट किया`;
          this.refreshTextElements();
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'UI_NAV_BACK': {
          if (this.screenHistory.length > 0) {
            const prev = this.screenHistory.pop()!;
            if (this.screens[prev]) {
              this.activeScreenName = prev;
            }
            this.appPreview.toastMessage = `पिछली स्क्रीन पर वापस आए`;
          } else {
            this.appPreview.toastMessage = `कोई पिछली स्क्रीन नहीं है`;
          }
          this.refreshTextElements();
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'UI_NAV_BUTTON': {
          const labelEval = this.evaluator.evaluate(node.labelExpr);
          const targetEval = this.evaluator.evaluate(node.targetExpr);
          const labelStr = String(labelEval ?? 'आगे').trim();
          const targetStr = String(targetEval ?? '').trim();

          if (!targetStr) {
            throw new EvaluatorError(
              `पंक्ति ${node.line} पर त्रुटि: 'नेविगेशन बटन' के लिए लक्षित स्क्रीन का नाम आवश्यक है।`,
              node.line
            );
          }

          const currentScr = this.ensureScreen(this.currentDefinitionScreen);
          this.appPreview.hasAppUi = true;
          this.lastDeclaredButtonLabel = labelStr;

          const existingIdx = currentScr.elements.findIndex(el => el.type === 'nav_button' && el.line === node.line);
          if (existingIdx !== -1) {
            currentScr.elements[existingIdx].content = labelStr;
            currentScr.elements[existingIdx].targetScreen = targetStr;
            currentScr.elements[existingIdx].buttonKey = labelStr;
            if (this.currentButtonColor) currentScr.elements[existingIdx].buttonColor = this.currentButtonColor;
          } else {
            currentScr.elements.push({
              id: crypto.randomUUID(),
              type: 'nav_button',
              content: labelStr,
              buttonKey: labelStr,
              targetScreen: targetStr,
              buttonColor: this.currentButtonColor,
              line: node.line
            });
          }

          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        // V1.5 Persistent Data Nodes
        case 'DATA_SAVE': {
          const keyEval = this.evaluator.evaluate(node.keyExpr);
          const keyStr = String(keyEval ?? '').trim();
          if (!keyStr) {
            throw new EvaluatorError(
              `पंक्ति ${node.line} पर त्रुटि: 'सहेजो' के लिए कुंजी खाली नहीं हो सकती।`,
              node.line
            );
          }

          const val = this.evaluator.evaluate(node.valExpr);
          safeStorage.saveData(keyStr, val);

          const displayVal = val !== undefined && val !== null ? String(val) : '';
          const successMsg = `✓ डेटा सफलतापूर्वक सहेजा गया: "${keyStr}" = ${displayVal}`;
          callbacks.onOutput({
            id: crypto.randomUUID(),
            type: 'stdout',
            text: successMsg,
            line: node.line,
            timestamp: new Date()
          });

          this.appPreview.toastMessage = `सहेजा गया: ${keyStr}`;
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'DATA_LOAD': {
          const keyEval = this.evaluator.evaluate(node.keyExpr);
          const keyStr = String(keyEval ?? '').trim();
          if (!keyStr) {
            throw new EvaluatorError(
              `पंक्ति ${node.line} पर त्रुटि: 'लोड करो' के लिए कुंजी खाली नहीं हो सकती।`,
              node.line
            );
          }

          const loadRes = safeStorage.loadData(keyStr);
          if (!loadRes.found) {
            throw new EvaluatorError(
              `पंक्ति ${node.line} पर त्रुटि: सहेजी गई कुंजी '${keyStr}' नहीं मिली। कृपया पहले 'सहेजो' का उपयोग करें।`,
              node.line
            );
          }

          this.scope[node.varName] = loadRes.value;
          this.evaluator.setScope(this.scope);
          this.syncVariableToInputs(node.varName, loadRes.value);
          this.refreshTextElements();

          const displayVal = loadRes.value !== undefined && loadRes.value !== null ? String(loadRes.value) : '';
          const successMsg = `✓ डेटा सफलतापूर्वक लोड किया गया: "${keyStr}" -> ${node.varName} = ${displayVal}`;
          callbacks.onOutput({
            id: crypto.randomUUID(),
            type: 'stdout',
            text: successMsg,
            line: node.line,
            timestamp: new Date()
          });

          this.appPreview.toastMessage = `लोड किया गया: ${keyStr}`;
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'DATA_DELETE': {
          const keyEval = this.evaluator.evaluate(node.keyExpr);
          const keyStr = String(keyEval ?? '').trim();
          if (!keyStr) {
            throw new EvaluatorError(
              `पंक्ति ${node.line} पर त्रुटि: 'हटाओ' के लिए कुंजी खाली नहीं हो सकती।`,
              node.line
            );
          }

          const delRes = safeStorage.deleteData(keyStr);
          if (!delRes.found) {
            throw new EvaluatorError(
              `पंक्ति ${node.line} पर त्रुटि: हटाने के लिए सहेजी गई कुंजी '${keyStr}' नहीं मिली।`,
              node.line
            );
          }

          const successMsg = `✓ सहेजा गया डेटा सफलतापूर्वक हटाया गया: "${keyStr}"`;
          callbacks.onOutput({
            id: crypto.randomUUID(),
            type: 'stdout',
            text: successMsg,
            line: node.line,
            timestamp: new Date()
          });

          this.appPreview.toastMessage = `हटाया गया: ${keyStr}`;
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        // V1.1, V1.2 & V1.3 UI Nodes
        case 'UI_TITLE': {
          const evaluated = this.evaluator.evaluate(node.expr);
          const titleStr = evaluated !== undefined ? String(evaluated) : 'मेरा ऐप';
          const currentScr = this.ensureScreen(this.currentDefinitionScreen);
          currentScr.title = titleStr;
          this.appPreview.hasAppUi = true;
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'STYLE_BG': {
          const evaluated = this.evaluator.evaluate(node.expr);
          const color = this.validateColor(evaluated, node.line, 'पृष्ठभूमि');
          const currentScr = this.ensureScreen(this.currentDefinitionScreen);
          currentScr.bgColor = color;
          this.appPreview.hasAppUi = true;
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'STYLE_COLOR': {
          const evaluated = this.evaluator.evaluate(node.expr);
          const color = this.validateColor(evaluated, node.line, 'रंग');
          this.currentTextColor = color;
          this.appPreview.hasAppUi = true;
          break;
        }

        case 'STYLE_BUTTON_COLOR': {
          const evaluated = this.evaluator.evaluate(node.expr);
          const color = this.validateColor(evaluated, node.line, 'बटन_रंग');
          this.currentButtonColor = color;
          this.appPreview.hasAppUi = true;
          break;
        }

        case 'STYLE_FONT_SIZE': {
          const evaluated = this.evaluator.evaluate(node.expr);
          const size = this.validateFontSize(evaluated, node.line, 'आकार');
          this.currentFontSize = size;
          this.appPreview.hasAppUi = true;
          break;
        }

        case 'STYLE_TITLE_FONT_SIZE': {
          const evaluated = this.evaluator.evaluate(node.expr);
          const size = this.validateFontSize(evaluated, node.line, 'शीर्षक_आकार');
          const currentScr = this.ensureScreen(this.currentDefinitionScreen);
          currentScr.titleFontSize = size;
          this.appPreview.hasAppUi = true;
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'UI_TEXT': {
          const evaluated = this.evaluator.evaluate(node.expr);
          const textStr = evaluated !== undefined ? String(evaluated) : '';
          const currentScr = this.ensureScreen(this.currentDefinitionScreen);
          this.appPreview.hasAppUi = true;

          const existingIdx = currentScr.elements.findIndex(el => el.type === 'text' && el.line === node.line);
          if (existingIdx !== -1) {
            currentScr.elements[existingIdx].content = textStr;
            currentScr.elements[existingIdx].expr = node.expr;
            if (this.currentTextColor) currentScr.elements[existingIdx].textColor = this.currentTextColor;
            if (this.currentFontSize) currentScr.elements[existingIdx].fontSize = this.currentFontSize;
          } else {
            const textElementIdx = currentScr.elements.findIndex(el => el.type === 'text');
            if (textElementIdx !== -1 && !currentScr.elements[textElementIdx].expr) {
              currentScr.elements[textElementIdx].content = textStr;
              currentScr.elements[textElementIdx].expr = node.expr;
              if (this.currentTextColor) currentScr.elements[textElementIdx].textColor = this.currentTextColor;
              if (this.currentFontSize) currentScr.elements[textElementIdx].fontSize = this.currentFontSize;
            } else {
              currentScr.elements.push({
                id: crypto.randomUUID(),
                type: 'text',
                content: textStr,
                expr: node.expr,
                textColor: this.currentTextColor,
                fontSize: this.currentFontSize,
                line: node.line
              });
            }
          }
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'UI_INPUT': {
          const evaluated = this.evaluator.evaluate(node.placeholderExpr);
          const placeholderStr = evaluated !== undefined ? String(evaluated) : 'मान दर्ज करें';
          const currentScr = this.ensureScreen(this.currentDefinitionScreen);
          this.appPreview.hasAppUi = true;

          let currentVal = '';
          if (this.scope[node.varName] !== undefined && this.scope[node.varName] !== null) {
            currentVal = String(this.scope[node.varName]);
          } else {
            this.scope[node.varName] = '';
            this.evaluator.setScope(this.scope);
          }

          const existingIdx = currentScr.elements.findIndex(el => el.type === 'input' && el.line === node.line);
          if (existingIdx !== -1) {
            currentScr.elements[existingIdx].content = placeholderStr;
            currentScr.elements[existingIdx].varName = node.varName;
            currentScr.elements[existingIdx].inputValue = currentVal;
          } else {
            currentScr.elements.push({
              id: crypto.randomUUID(),
              type: 'input',
              content: placeholderStr,
              varName: node.varName,
              inputValue: currentVal,
              line: node.line
            });
          }
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'UI_BUTTON': {
          const evaluated = this.evaluator.evaluate(node.labelExpr);
          const labelStr = evaluated !== undefined ? String(evaluated) : 'बटन';
          const currentScr = this.ensureScreen(this.currentDefinitionScreen);
          this.appPreview.hasAppUi = true;
          this.lastDeclaredButtonLabel = labelStr;

          const existingIdx = currentScr.elements.findIndex(el => el.type === 'button' && el.line === node.line);
          if (existingIdx !== -1) {
            currentScr.elements[existingIdx].content = labelStr;
            currentScr.elements[existingIdx].buttonKey = labelStr;
            if (this.currentButtonColor) currentScr.elements[existingIdx].buttonColor = this.currentButtonColor;
          } else {
            currentScr.elements.push({
              id: crypto.randomUUID(),
              type: 'button',
              content: labelStr,
              buttonKey: labelStr,
              buttonColor: this.currentButtonColor,
              line: node.line
            });
          }
          this.syncAppPreview();
          callbacks.onAppPreviewUpdate?.(this.getAppPreview());
          break;
        }

        case 'UI_ON_BUTTON': {
          const currentScr = this.ensureScreen(this.currentDefinitionScreen);
          this.appPreview.hasAppUi = true;
          const targetKey = node.buttonLabel || this.lastDeclaredButtonLabel || '__DEFAULT__';
          currentScr.buttonHandlers.set(targetKey, node.body);
          if (!currentScr.buttonHandlers.has('__DEFAULT__')) {
            currentScr.buttonHandlers.set('__DEFAULT__', node.body);
          }
          break;
        }

        case 'PRINT': {
          const rawExpr = node.expr;
          const evaluated = this.evaluator.evaluate(rawExpr);
          const textToDisplay = evaluated !== undefined ? String(evaluated) : '';

          this.appPreview.toastMessage = textToDisplay;

          callbacks.onOutput({
            id: crypto.randomUUID(),
            type: 'stdout',
            text: textToDisplay,
            line: node.line,
            timestamp: new Date()
          });
          break;
        }

        case 'INPUT': {
          const promptEval = this.evaluator.evaluate(node.promptText);
          const promptMsg = String(promptEval ?? 'मान दर्ज करें:');

          callbacks.onOutput({
            id: crypto.randomUUID(),
            type: 'input-prompt',
            text: promptMsg,
            line: node.line,
            timestamp: new Date()
          });

          const userInput = await callbacks.onPromptInput(promptMsg, node.varName);
          if (this.isCancelled) return undefined;

          const normInput = normalizeHindiNumerals(userInput.trim());
          let finalVal: any = userInput;
          if (normInput !== '' && !isNaN(Number(normInput))) {
            finalVal = Number(normInput);
          }

          this.scope[node.varName] = finalVal;
          this.evaluator.setScope(this.scope);

          callbacks.onOutput({
            id: crypto.randomUUID(),
            type: 'input-echo',
            text: `> ${userInput}`,
            timestamp: new Date()
          });
          break;
        }

        case 'MATH_CMD': {
          const valA = Number(this.evaluator.evaluate(node.aExpr));
          const valB = Number(this.evaluator.evaluate(node.bExpr));

          if (isNaN(valA) || isNaN(valB)) {
            throw new EvaluatorError(`पंक्ति ${node.line} पर त्रुटि: गणितीय कमांड के लिए वैध संख्याएं आवश्यक हैं।`, node.line);
          }

          let result = 0;
          let label = '';
          if (node.op === 'ADD') {
            result = valA + valB;
            label = `${valA} और ${valB} का जोड़ = ${result}`;
          } else if (node.op === 'SUB') {
            result = valA - valB;
            label = `${valA} में से ${valB} घटाने पर = ${result}`;
          } else if (node.op === 'MUL') {
            result = valA * valB;
            label = `${valA} और ${valB} का गुणा = ${result}`;
          } else if (node.op === 'DIV') {
            if (valB === 0) {
              throw new EvaluatorError(`पंक्ति ${node.line} पर त्रुटि: शून्य (0) से भाग नहीं दिया जा सकता।`, node.line);
            }
            result = valA / valB;
            label = `${valA} में ${valB} का भाग = ${result}`;
          }

          this.appPreview.toastMessage = label;

          callbacks.onOutput({
            id: crypto.randomUUID(),
            type: 'stdout',
            text: label,
            line: node.line,
            timestamp: new Date()
          });
          break;
        }

        case 'VAR_ASSIGN': {
          const val = this.evaluator.evaluate(node.expr);
          this.scope[node.name] = val;
          this.evaluator.setScope(this.scope);
          this.syncVariableToInputs(node.name, val);
          this.refreshTextElements();
          break;
        }

        case 'IF': {
          const condResult = Boolean(this.evaluator.evaluate(node.condition));
          if (condResult) {
            const ctrl = await this.executeNodes(node.thenBranch, callbacks);
            if (ctrl) return ctrl;
          } else {
            let matched = false;
            for (const elseIf of node.elseIfBranches) {
              this.evaluator.setLine(elseIf.line);
              if (Boolean(this.evaluator.evaluate(elseIf.condition))) {
                matched = true;
                const ctrl = await this.executeNodes(elseIf.body, callbacks);
                if (ctrl) return ctrl;
                break;
              }
            }
            if (!matched && node.elseBranch) {
              const ctrl = await this.executeNodes(node.elseBranch, callbacks);
              if (ctrl) return ctrl;
            }
          }
          break;
        }

        case 'REPEAT': {
          const count = Number(this.evaluator.evaluate(node.countExpr));
          if (isNaN(count) || count < 0) {
            throw new EvaluatorError(`पंक्ति ${node.line} पर त्रुटि: 'दोहराओ' के लिए धनात्मक पूर्णांक आवश्यक है, '${node.countExpr}' नहीं।`, node.line);
          }

          const iterations = Math.floor(count);
          for (let step = 1; step <= iterations; step++) {
            if (this.isCancelled) return undefined;
            this.scope['चक्र'] = step;
            this.scope['i'] = step;
            this.evaluator.setScope(this.scope);

            const ctrl = await this.executeNodes(node.body, callbacks);
            if (ctrl === 'BREAK') break;
            if (ctrl === 'CONTINUE') continue;
          }
          break;
        }

        case 'WHILE': {
          while (Boolean(this.evaluator.evaluate(node.condition))) {
            if (this.isCancelled) return undefined;
            const ctrl = await this.executeNodes(node.body, callbacks);
            if (ctrl === 'BREAK') break;
            if (ctrl === 'CONTINUE') continue;

            this.evaluator.setLine(node.line);
            this.evaluator.setScope(this.scope);
          }
          break;
        }

        case 'BREAK':
          return 'BREAK';

        case 'CONTINUE':
          return 'CONTINUE';
      }
    }

    return undefined;
  }
}
