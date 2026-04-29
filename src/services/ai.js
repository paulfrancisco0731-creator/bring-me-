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
  const prompt = `You are the game master for "Saan Mo Sya Dalhin". 
Theme: ${theme}.
Players: ${playerCount}.

Generate exactly 6 items. 
Rules:
1. Items must be common objects found in an average Filipino household (e.g., walis tingting, remote, tsinelas, sandok, toothbrush, hanger).
2. Every item MUST include a silly action (e.g., "Toothbrush placed on your forehead", "Remote as a phone", "Hanger as a crown").
3. Make them funny and relatable (Taglish if Filipino Humor).

Respond strictly in JSON format:
{
  "items": [
    {
      "id": 1,
      "description": "Object + Silly Action"
    }
  ]
}`;

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
  const prompt = `Judge this photo for: "${itemDescription}". 

RULES FOR JUDGING:
1. BE LENIENT AND GENEROUS. This is a fun game, not a court case!
2. If you see the item and a decent attempt at the action, award 80-100 points.
3. Award points for effort and creativity, even if it's not perfect.
4. Only give low points if the item is clearly missing or it's a fake photo.

Respond ONLY in JSON format: {"points": number, "reason": "Funny Taglish compliment/comment"}`;

  try {
    const data = await groqFetch({
      messages: [
        { role: "system", content: "You are a fun, generous game show judge that outputs only JSON." },
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
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Groq Vision Error:", error);
    return { 
      points: 70, 
      reason: "Ang galing! AI is loading so here's a default 70 pts for the effort!" 
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
