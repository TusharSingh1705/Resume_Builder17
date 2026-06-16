
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function enhanceText(originalText) {
  if (!originalText || !originalText.trim()) {
    throw new Error('No text provided');
  }

  function simpleEnhance(text) {
    const lines = text.split('\n');
    const enhanced = [];
    const actionVerbs = [
      'Developed', 'Implemented', 'Optimized', 'Designed', 'Created',
      'Enhanced', 'Improved', 'Spearheaded', 'Collaborated', 'Managed',
    ];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      line = line.replace(/^[*\-•]+\s*/, '');

      // Add action verb if missing
      if (line && !actionVerbs.some(verb => line.startsWith(verb))) {
        line = `* Developed and enhanced ${line.toLowerCase()}`;
      } else {
        line = `* ${line}`;
      }
      enhanced.push(line);
    }

    return enhanced.length > 0 ? enhanced.join('\n') : originalText;
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {

      return {
        enhanced_text: simpleEnhance(originalText),
        warning: 'Using basic enhancement (API key not configured)',
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 300, 
      },
    });

    const prompt = `Rewrite the following resume bullet points to be professional and action-oriented.
Use strong action verbs. Do NOT add fake metrics or numbers.
Return ONLY the enhanced text (no markdown, no asterisks).

Text: ${originalText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleaned = response.text().replace(/\*/g, '').replace(/•/g, '').trim();

    return { enhanced_text: cleaned };

  } catch (apiError) {
    const errorStr = String(apiError);
    console.log(`API Error: ${errorStr}`); // Log for debugging (same as Python's print)

    const fallbackText = simpleEnhance(originalText);
    return {
      enhanced_text: fallbackText,
      warning: 'Using basic enhancement (API unavailable)',
    };
  }
}

async function enhanceResumeText(rawText) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return `* ${rawText.trim()}` || '* No content provided';
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 300, 
      },
    });

    const prompt = `Act as a professional resume writer. Rewrite the following rough bullet points to be impactful and action-oriented.

STRICT RULES:
1. Use ONLY information provided - NO fabrication
2. For simple inputs (<5 words), return exactly 1 bullet point
3. For longer inputs, return maximum 2-3 bullet points
4. Start each bullet with a strong action verb
5. Keep it concise and professional
6. Return ONLY the bullet points (no extra text)

Input Text:
${rawText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();

  } catch (error) {
    const errorStr = String(error);

    if (errorStr.includes('429') || errorStr.toLowerCase().includes('quota')) {
      return rawText.trim() ? `* ${rawText.trim()}` : '* No content provided';
    }
    throw error;
  }
}

module.exports = { enhanceText, enhanceResumeText };
