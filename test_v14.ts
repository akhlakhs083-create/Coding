import { HindiInterpreter } from './src/language/interpreter';
import { EXAMPLES } from './src/language/examples';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✓ PASS: ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message || String(err) });
    console.error(`✗ FAIL: ${name}:`, err.message || err);
  }
}

async function runAllTests() {
  console.log('\n=============================================');
  console.log('   HINDI CODING STUDIO V1.4 TEST SUITE');
  console.log('=============================================\n');

  // -------------------------------------------------------------
  // 1. REGRESSION TESTS: V1.0 (Basics, Math, Conditionals, Loops)
  // -------------------------------------------------------------
  await runTest('V1.0 - Hello World ("दिखाओ")', async () => {
    const interpreter = new HindiInterpreter();
    const outputs: string[] = [];
    const ok = await interpreter.execute('दिखाओ "नमस्ते दुनिया!"\nदिखाओ "जय हिन्द!"', {
      onOutput: (msg) => { if (msg.type === 'stdout') outputs.push(msg.text); },
      onPromptInput: async () => ''
    });
    if (!ok || outputs.length !== 2 || outputs[0] !== 'नमस्ते दुनिया!' || outputs[1] !== 'जय हिन्द!') {
      throw new Error(`Unexpected outputs: ${JSON.stringify(outputs)}`);
    }
  });

  await runTest('V1.0 - Direct Arithmetic Commands (जोड़ो, घटाओ, गुणा, भाग)', async () => {
    const interpreter = new HindiInterpreter();
    const outputs: string[] = [];
    await interpreter.execute('जोड़ो 15 और 25\nघटाओ 50 में से 18\nगुणा 6 और 7\nभाग 48 में 6 का', {
      onOutput: (msg) => { if (msg.type === 'stdout') outputs.push(msg.text); },
      onPromptInput: async () => ''
    });
    if (!outputs[0].includes('40') || !outputs[1].includes('32') || !outputs[2].includes('42') || !outputs[3].includes('8')) {
      throw new Error(`Arithmetic output mismatch: ${JSON.stringify(outputs)}`);
    }
  });

  await runTest('V1.0 - Conditionals (अगर ... वरना ... समाप्त)', async () => {
    const interpreter = new HindiInterpreter();
    const outputs: string[] = [];
    await interpreter.execute(`मान आयु = 20\nअगर आयु बड़ा या बराबर 18\n    दिखाओ "पात्र"\nवरना\n    दिखाओ "अपात्र"\nसमाप्त`, {
      onOutput: (msg) => { if (msg.type === 'stdout') outputs.push(msg.text); },
      onPromptInput: async () => ''
    });
    if (outputs[0] !== 'पात्र') {
      throw new Error(`Condition output mismatch: ${outputs[0]}`);
    }
  });

  await runTest('V1.0 - Repeat Loop (दोहराओ N बार)', async () => {
    const interpreter = new HindiInterpreter();
    const outputs: string[] = [];
    await interpreter.execute(`दोहराओ 3 बार\n    दिखाओ "चक्र:" + चक्र\nसमाप्त`, {
      onOutput: (msg) => { if (msg.type === 'stdout') outputs.push(msg.text); },
      onPromptInput: async () => ''
    });
    if (outputs.length !== 3 || outputs[0] !== 'चक्र:1' || outputs[2] !== 'चक्र:3') {
      throw new Error(`Loop output mismatch: ${JSON.stringify(outputs)}`);
    }
  });

  // -------------------------------------------------------------
  // 2. REGRESSION TESTS: V1.1 (App UI: शीर्षक, पाठ, बटन, जब बटन दबे)
  // -------------------------------------------------------------
  await runTest('V1.1 - Interactive UI Elements & Button Click', async () => {
    const interpreter = new HindiInterpreter();
    const outputs: string[] = [];
    await interpreter.execute(`शीर्षक "मेरा पहला ऐप"\nपाठ "नमस्ते"\nबटन "दबाएँ"\n\nजब बटन दबे\n    दिखाओ "आपने बटन दबाया"\n    पाठ "बटन दबाया गया"\nसमाप्त`, {
      onOutput: (msg) => { if (msg.type === 'stdout') outputs.push(msg.text); },
      onPromptInput: async () => ''
    });

    const preview = interpreter.getAppPreview();
    if (preview.title !== 'मेरा पहला ऐप' || preview.elements.length !== 2) {
      throw new Error(`Preview state mismatch: title=${preview.title}, elements=${preview.elements.length}`);
    }

    // Execute button action
    await interpreter.executeButtonAction('दबाएँ', {
      onOutput: (msg) => { if (msg.type === 'stdout') outputs.push(msg.text); },
      onPromptInput: async () => ''
    });

    if (!outputs.includes('आपने बटन दबाया')) {
      throw new Error(`Button action failed, outputs: ${JSON.stringify(outputs)}`);
    }
  });

  // -------------------------------------------------------------
  // 3. REGRESSION TESTS: V1.2 (Variables, Inputs, Interpolation)
  // -------------------------------------------------------------
  await runTest('V1.2 - Variables, Text Concatenation & In-Preview Dynamic Updates', async () => {
    const interpreter = new HindiInterpreter();
    await interpreter.execute(`मान नाम = "अमित"\nमान संख्या = 10\nपाठ "नमस्ते " + नाम\nइनपुट "अपना नाम लिखें" नाम\nबटन "नमस्ते बोलें"\n\nजब बटन दबे\n    संख्या = संख्या + 5\n    दिखाओ "संख्या: " + संख्या\nसमाप्त`, {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    const preview = interpreter.getAppPreview();
    const textEl = preview.elements.find(e => e.type === 'text');
    if (!textEl || textEl.content !== 'नमस्ते अमित') {
      throw new Error(`Interpolation mismatch: ${textEl?.content}`);
    }

    // User types into input in preview
    interpreter.updateInputValue('नाम', 'रोहित');
    const updatedPreview = interpreter.getAppPreview();
    const updatedTextEl = updatedPreview.elements.find(e => e.type === 'text');
    if (updatedTextEl?.content !== 'नमस्ते रोहित') {
      throw new Error(`Live input update failed: ${updatedTextEl?.content}`);
    }
  });

  // -------------------------------------------------------------
  // 4. REGRESSION TESTS: V1.3 (UI Styling: पृष्ठभूमि, रंग, बटन_रंग, आकार)
  // -------------------------------------------------------------
  await runTest('V1.3 - Valid UI Styling (Background, Colors, Font Sizes)', async () => {
    const interpreter = new HindiInterpreter();
    await interpreter.execute(`शीर्षक "स्टाइल ऐप"\nशीर्षक_आकार 28\nपृष्ठभूमि "#101827"\nरंग "#FFFFFF"\nआकार 20\nपाठ "सफेद टेक्स्ट"\nबटन_रंग "#FF8800"\nबटन "क्लिक"`, {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    const preview = interpreter.getAppPreview();
    if (preview.bgColor !== '#101827' || preview.titleFontSize !== 28) {
      throw new Error(`Screen style mismatch: bg=${preview.bgColor}, titleFontSize=${preview.titleFontSize}`);
    }
    const textEl = preview.elements.find(e => e.type === 'text');
    if (textEl?.textColor !== '#FFFFFF' || textEl?.fontSize !== 20) {
      throw new Error(`Text style mismatch: color=${textEl?.textColor}, size=${textEl?.fontSize}`);
    }
    const btnEl = preview.elements.find(e => e.type === 'button');
    if (btnEl?.buttonColor !== '#FF8800') {
      throw new Error(`Button style mismatch: color=${btnEl?.buttonColor}`);
    }
  });

  await runTest('V1.3 - Rejects Invalid Color Codes with Hindi Error & Line Number', async () => {
    const interpreter = new HindiInterpreter();
    let errorMsg = '';
    let errorLine: number | undefined;
    await interpreter.execute('शीर्षक "टेस्ट"\nपृष्ठभूमि "not-a-color"', {
      onOutput: (msg) => {
        if (msg.type === 'stderr') {
          errorMsg = msg.text;
          errorLine = msg.line;
        }
      },
      onPromptInput: async () => ''
    });

    if (!errorMsg.includes('अमान्य रंग कोड') || errorLine !== 2) {
      throw new Error(`Expected color error on line 2, got: msg="${errorMsg}", line=${errorLine}`);
    }
  });

  await runTest('V1.3 - Rejects Out-of-Range Font Sizes (10-48px safe range)', async () => {
    const interpreter = new HindiInterpreter();
    let errorMsg = '';
    let errorLine: number | undefined;
    await interpreter.execute('शीर्षक "टेस्ट"\nआकार 80', {
      onOutput: (msg) => {
        if (msg.type === 'stderr') {
          errorMsg = msg.text;
          errorLine = msg.line;
        }
      },
      onPromptInput: async () => ''
    });

    if (!errorMsg.includes('अमान्य आकार') || errorLine !== 2) {
      throw new Error(`Expected font size error on line 2, got: msg="${errorMsg}", line=${errorLine}`);
    }
  });

  // -------------------------------------------------------------
  // 5. NEW V1.4 MULTI-SCREEN APP FEATURES
  // -------------------------------------------------------------
  await runTest('V1.4 - Screen Creation (स्क्रीन "होम", स्क्रीन "प्रोफाइल", स्क्रीन "सेटिंग्स")', async () => {
    const interpreter = new HindiInterpreter();
    const ok = await interpreter.execute(`स्क्रीन "होम"\nशीर्षक "होम स्क्रीन"\nपाठ "होम पर आपका स्वागत है"\n\nस्क्रीन "प्रोफाइल"\nशीर्षक "मेरी प्रोफाइल"\nपाठ "उपयोगकर्ता विवरण"\n\nस्क्रीन "सेटिंग्स"\nशीर्षक "सेटिंग्स स्क्रीन"\nपाठ "सिस्टम कॉन्फ़िगरेशन"`, {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    if (!ok) throw new Error('Execution failed');

    const preview = interpreter.getAppPreview();
    const screenNames = Object.keys(preview.screens);
    if (screenNames.length !== 3 || !screenNames.includes('होम') || !screenNames.includes('प्रोफाइल') || !screenNames.includes('सेटिंग्स')) {
      throw new Error(`Expected 3 screens, got: ${JSON.stringify(screenNames)}`);
    }

    // Active screen initially should be the first defined screen ("होम")
    if (preview.activeScreen !== 'होम') {
      throw new Error(`Expected active screen to be 'होम', got: '${preview.activeScreen}'`);
    }

    // Elements shown in preview should only be from the active screen ("होम")
    if (preview.elements.length !== 1 || preview.elements[0].content !== 'होम पर आपका स्वागत है') {
      throw new Error(`Active screen elements mismatch: ${JSON.stringify(preview.elements)}`);
    }
  });

  await runTest('V1.4 - Multiple Screens Each with Independent Styling', async () => {
    const interpreter = new HindiInterpreter();
    await interpreter.execute(`स्क्रीन "होम"\nशीर्षक "होम"\nशीर्षक_आकार 22\nपृष्ठभूमि "#0F172A"\nरंग "#38BDF8"\nपाठ "होम टेक्स्ट"\n\nस्क्रीन "प्रोफाइल"\nशीर्षक "प्रोफाइल"\nशीर्षक_आकार 26\nपृष्ठभूमि "#1E1B4B"\nरंग "#A78BFA"\nपाठ "प्रोफाइल टेक्स्ट"`, {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    const previewHome = interpreter.getAppPreview();
    if (previewHome.bgColor !== '#0F172A' || previewHome.titleFontSize !== 22) {
      throw new Error(`Home screen styling mismatch: bg=${previewHome.bgColor}, size=${previewHome.titleFontSize}`);
    }

    // Navigate to profile
    interpreter.navigateToScreen('प्रोफाइल');
    const previewProfile = interpreter.getAppPreview();
    if (previewProfile.bgColor !== '#1E1B4B' || previewProfile.titleFontSize !== 26) {
      throw new Error(`Profile screen styling mismatch: bg=${previewProfile.bgColor}, size=${previewProfile.titleFontSize}`);
    }
    const profileText = previewProfile.elements.find(e => e.type === 'text');
    if (profileText?.textColor !== '#A78BFA') {
      throw new Error(`Profile text color mismatch: ${profileText?.textColor}`);
    }
  });

  await runTest('V1.4 - Programmatic Navigation ("खोलो "प्रोफाइल"") and Back ("वापस")', async () => {
    const interpreter = new HindiInterpreter();
    await interpreter.execute(`स्क्रीन "होम"\nशीर्षक "होम"\nपाठ "होम पेज"\n\nस्क्रीन "प्रोफाइल"\nशीर्षक "प्रोफाइल"\nपाठ "प्रोफाइल पेज"\n\nखोलो "प्रोफाइल"`, {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    let preview = interpreter.getAppPreview();
    if (preview.activeScreen !== 'प्रोफाइल') {
      throw new Error(`Expected active screen to be 'प्रोफाइल', got: ${preview.activeScreen}`);
    }
    if (preview.screenHistory.length !== 1 || preview.screenHistory[0] !== 'होम') {
      throw new Error(`Expected screenHistory ['होम'], got: ${JSON.stringify(preview.screenHistory)}`);
    }

    // Execute navigateBack
    const backSuccess = interpreter.navigateBack();
    if (!backSuccess) throw new Error('navigateBack returned false');

    preview = interpreter.getAppPreview();
    if (preview.activeScreen !== 'होम') {
      throw new Error(`Expected active screen after back to be 'होम', got: ${preview.activeScreen}`);
    }
    if (preview.screenHistory.length !== 0) {
      throw new Error(`Expected empty history after back, got: ${JSON.stringify(preview.screenHistory)}`);
    }
  });

  await runTest('V1.4 - Navigation Button ("नेविगेशन बटन "प्रोफाइल" "प्रोफाइल"") Click Action', async () => {
    const interpreter = new HindiInterpreter();
    await interpreter.execute(`स्क्रीन "होम"\nशीर्षक "होम"\nनेविगेशन बटन "प्रोफाइल देखें" "प्रोफाइल"\n\nस्क्रीन "प्रोफाइल"\nशीर्षक "प्रोफाइल"\nनेविगेशन बटन "होम पर लौटें" "होम"`, {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    let preview = interpreter.getAppPreview();
    if (preview.activeScreen !== 'होम') throw new Error(`Initial active screen mismatch: ${preview.activeScreen}`);
    const navBtn = preview.elements.find(e => e.type === 'nav_button');
    if (!navBtn || navBtn.targetScreen !== 'प्रोफाइल') {
      throw new Error(`Navigation button element not created properly: ${JSON.stringify(navBtn)}`);
    }

    // Tap the navigation button
    const clickSuccess = await interpreter.executeButtonAction('प्रोफाइल देखें', {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    if (!clickSuccess) throw new Error('executeButtonAction failed for navigation button');

    preview = interpreter.getAppPreview();
    if (preview.activeScreen !== 'प्रोफाइल') {
      throw new Error(`Expected active screen after nav click to be 'प्रोफाइल', got: ${preview.activeScreen}`);
    }

    // Tap the return button on Profile screen
    await interpreter.executeButtonAction('होम पर लौटें', {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    preview = interpreter.getAppPreview();
    if (preview.activeScreen !== 'होम') {
      throw new Error(`Expected return to 'होम', got: ${preview.activeScreen}`);
    }
  });

  await runTest('V1.4 - Prevents Navigation to Undefined Screen with Clear Hindi Error & Line Number', async () => {
    const interpreter = new HindiInterpreter();
    let errorMsg = '';
    let errorLine: number | undefined;

    const ok = await interpreter.execute(`स्क्रीन "होम"\nखोलो "काल्पनिक_स्क्रीन"`, {
      onOutput: (msg) => {
        if (msg.type === 'stderr') {
          errorMsg = msg.text;
          errorLine = msg.line;
        }
      },
      onPromptInput: async () => ''
    });

    if (ok) throw new Error('Expected execution to fail for undefined screen');
    if (!errorMsg.includes("स्क्रीन 'काल्पनिक_स्क्रीन' मौजूद नहीं है") || errorLine !== 2) {
      throw new Error(`Expected undefined screen error on line 2, got: msg="${errorMsg}", line=${errorLine}`);
    }
  });

  await runTest('V1.4 - Navigation Button Tapping Undefined Screen Reports Hindi Error & Line Number', async () => {
    const interpreter = new HindiInterpreter();
    let errorMsg = '';
    let errorLine: number | undefined;

    await interpreter.execute(`स्क्रीन "होम"\nनेविगेशन बटन "अज्ञात पर जाएं" "अज्ञात"`, {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    const clickOk = await interpreter.executeButtonAction('अज्ञात पर जाएं', {
      onOutput: (msg) => {
        if (msg.type === 'stderr') {
          errorMsg = msg.text;
          errorLine = msg.line;
        }
      },
      onPromptInput: async () => ''
    });

    if (clickOk) throw new Error('Expected click action to fail for undefined screen');
    if (!errorMsg.includes("स्क्रीन 'अज्ञात' मौजूद नहीं है") || errorLine !== 2) {
      throw new Error(`Expected nav button undefined screen error on line 2, got: msg="${errorMsg}", line=${errorLine}`);
    }
  });

  await runTest('V1.4 - Invalid Screen Definition (स्क्रीन "") Reports Error with Line Number', async () => {
    const interpreter = new HindiInterpreter();
    let errorMsg = '';
    let errorLine: number | undefined;

    await interpreter.execute(`स्क्रीन ""`, {
      onOutput: (msg) => {
        if (msg.type === 'stderr') {
          errorMsg = msg.text;
          errorLine = msg.line;
        }
      },
      onPromptInput: async () => ''
    });

    if (!errorMsg.includes("स्क्रीन का नाम अमान्य है") || errorLine !== 1) {
      throw new Error(`Expected invalid screen name error on line 1, got: msg="${errorMsg}", line=${errorLine}`);
    }
  });

  await runTest('V1.4 - Cross-Screen Variable State Persistence', async () => {
    const interpreter = new HindiInterpreter();
    await interpreter.execute(`मान साझा_नाम = "कविता"\n\nस्क्रीन "होम"\nशीर्षक "होम"\nपाठ "नमस्ते " + साझा_नाम\nनेविगेशन बटन "प्रोफाइल" "प्रोफाइल"\n\nस्क्रीन "प्रोफाइल"\nशीर्षक "प्रोफाइल"\nइनपुट "नाम बदलें" साझा_नाम\nपाठ "प्रोफाइल पर: " + साझा_नाम`, {
      onOutput: () => {},
      onPromptInput: async () => ''
    });

    // Verify Home text
    let preview = interpreter.getAppPreview();
    let textEl = preview.elements.find(e => e.type === 'text');
    if (textEl?.content !== 'नमस्ते कविता') {
      throw new Error(`Home screen initial text mismatch: ${textEl?.content}`);
    }

    // Navigate to profile
    interpreter.navigateToScreen('प्रोफाइल');
    preview = interpreter.getAppPreview();
    textEl = preview.elements.find(e => e.type === 'text');
    if (textEl?.content !== 'प्रोफाइल पर: कविता') {
      throw new Error(`Profile screen initial text mismatch: ${textEl?.content}`);
    }

    // Change input value on profile screen
    interpreter.updateInputValue('साझा_नाम', 'सुमन');
    preview = interpreter.getAppPreview();
    textEl = preview.elements.find(e => e.type === 'text');
    if (textEl?.content !== 'प्रोफाइल पर: सुमन') {
      throw new Error(`Profile screen updated text mismatch: ${textEl?.content}`);
    }

    // Navigate back to Home and verify update persisted
    interpreter.navigateBack();
    preview = interpreter.getAppPreview();
    textEl = preview.elements.find(e => e.type === 'text');
    if (textEl?.content !== 'नमस्ते सुमन') {
      throw new Error(`Home screen persisted text mismatch: ${textEl?.content}`);
    }
  });

  // -------------------------------------------------------------
  // 6. VERIFY ALL EXAMPLES (Including the new "मेरा मल्टी-स्क्रीन ऐप")
  // -------------------------------------------------------------
  await runTest('V1.4 - All Example Programs Execute Cleanly Without Errors', async () => {
    for (const ex of EXAMPLES) {
      const interpreter = new HindiInterpreter();
      const errLogs: string[] = [];
      const ok = await interpreter.execute(ex.code, {
        onOutput: (msg) => {
          if (msg.type === 'stderr') errLogs.push(msg.text);
        },
        onPromptInput: async () => 'परीक्षण_इनपुट'
      });
      if (!ok || errLogs.length > 0) {
        throw new Error(`Example '${ex.title}' (${ex.id}) failed execution: ${errLogs.join('; ')}`);
      }
    }
  });

  console.log('\n=============================================');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length}`);
  console.log(`PASSED:      ${passedCount}`);
  console.log(`FAILED:      ${failedCount}`);
  console.log('=============================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Test suite failed:', e);
  process.exit(1);
});
