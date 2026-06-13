// Replace ANTHROPIC_KEY with:
const GEMINI_KEY = process.env.REACT_APP_GEMINI_KEY;

// Replace the fetch block with:
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userMessage }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] }
    })
  }
);
const data = await response.json();
return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Try again.';
