const API_KEY = "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const groqFetch = async (payload) => {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errText = await response.text();
    console.error(`Groq API Error (${response.status}):`, errText);
    throw new Error(`Groq API error: ${response.status}`);
  }
  
  return response.json();
};

export const generateItems = async (theme, playerCount) => {
  const prompt = `Generate a list of 6 "Bring Me" items for ${playerCount} players. Theme: ${theme}. 
Respond ONLY with a JSON object: {"items": [{"id": 1, "description": "..."}]}`;

  try {
    const data = await groqFetch({
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs only JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Groq Text Error:", error);
    return null;
  }
};

export const verifyPhoto = async (itemDescription, base64Image) => {
  const prompt = `Judge this photo for the item: "${itemDescription}". Award 0-100 points. Return ONLY a JSON object: {"points": 85, "reason": "..."}`;

  try {
    const data = await groqFetch({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      model: "llama-3.2-90b-vision-preview"
    });
    
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Groq Vision Error:", error);
    // Return the error message so the user can see it
    return { 
      points: 0, 
      reason: `AI Judge Error: ${error.message}. Check your Groq key/limits.` 
    };
  }
};

export const generateRecap = async (gameData, theme) => {
  const prompt = `Write a funny Taglish recap for this game data: ${JSON.stringify(gameData)}`;

  try {
    const data = await groqFetch({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile"
    });
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Groq Recap Error:", error);
    return "What a game! Everyone did great! 😂";
  }
};
