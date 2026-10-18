/**
 * HindiScript Token and Keyword Definitions
 */

// Convert Hindi Devanagari numerals (०, १, २, ३, ४, ५, ६, ७, ८, ९) to standard Arabic numerals
export function normalizeHindiNumerals(text: string): string {
  const hindiDigits: { [key: string]: string } = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };
  return text.replace(/[०-९]/g, (match) => hindiDigits[match] || match);
}

// Check if string is a valid variable identifier
export function isValidIdentifier(str: string): boolean {
  if (!str) return false;
  // Allow Hindi letters (Unicode range \u0900-\u097F), Latin letters, underscores, and digits (not at start)
  return /^[\u0900-\u097Fa-zA-Z_][\u0900-\u097Fa-zA-Z0-9_]*$/.test(str);
}

// Built-in keywords for HindiScript
export const KEYWORDS = {
  PRINT: ['दिखाओ', 'प्रिंट', 'लिखो'],
  VAR_DECL: ['मान', 'चर'],
  IF: 'अगर',
  ELSE_IF: 'वरना अगर',
  ELSE: 'वरना',
  END: ['समाप्त', 'खत्म', 'अंत'],
  REPEAT: 'दोहराओ',
  TIMES: 'बार',
  WHILE: 'जबतक',
  BREAK: 'रुको',
  CONTINUE: 'आगे',
  INPUT: ['पूछो'],
  
  // Math direct commands
  ADD_CMD: 'जोड़ो',
  SUBTRACT_CMD: 'घटाओ',
  MULTIPLY_CMD: 'गुणा',
  DIVIDE_CMD: 'भाग',
  
  // Logical / Comparison
  AND: ['और', 'तथा', '&&'],
  OR: ['या', 'अथवा', '||'],
  NOT: ['नहीं', '!'],
  GREATER_THAN_EQUAL: ['बड़ा या बराबर', '>=', 'बड़ा या बराबर'],
  LESS_THAN_EQUAL: ['छोटा या बराबर', '<=', 'छोटा या बराबर'],
  NOT_EQUAL: ['बराबर नहीं', '!=', 'समान नहीं'],
  GREATER_THAN: ['बड़ा', 'बड़ा', '>'],
  LESS_THAN: ['छोटा', '<'],
  EQUAL: ['बराबर', '==', 'समान'],
  
  TRUE: ['सत्य', 'सही', 'true'],
  FALSE: ['असत्य', 'गलत', 'false'],
  LOOP_VAR: 'चक्र',

  // UI Interactive App Keywords (V1.1, V1.2 & V1.3)
  APP_TITLE: 'शीर्षक',
  APP_TEXT: 'पाठ',
  APP_BUTTON: 'बटन',
  WHEN_BUTTON: 'जब बटन',
  APP_INPUT: 'इनपुट',

  // UI Styling Keywords (V1.3)
  STYLE_BG: 'पृष्ठभूमि',
  STYLE_COLOR: 'रंग',
  STYLE_BUTTON_COLOR: 'बटन_रंग',
  STYLE_FONT_SIZE: 'आकार',
  STYLE_TITLE_FONT_SIZE: 'शीर्षक_आकार',

  // Multi-Screen App Keywords (V1.4)
  SCREEN: 'स्क्रीन',
  NAVIGATE: 'खोलो',
  NAV_BACK: 'वापस',
  NAV_BUTTON: ['नेविगेशन बटन', 'नेविगेशन_बटन'],

  // Persistent Data Keywords (V1.5)
  SAVE_DATA: 'सहेजो',
  LOAD_DATA: ['लोड करो', 'लोड_करो', 'लोड'],
  DELETE_DATA: ['हटाओ', 'मिटाओ']
};
