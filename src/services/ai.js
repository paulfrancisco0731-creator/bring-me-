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
    const errData = await response.json();
    throw new Error(errData.error?.message || "Groq API error");
  }
  
  return response.json();
};

export const generateItems = async (theme, playerCount) => {
  const prompt = `You are the game master for a Filipino "Bring Me" game called "Saan Mo Sya Dalhin".
Theme: ${theme === "Filipino Humor" ? "Filipino Humor (use Taglish, funny everyday items, lutong bahay, etc)" : "Random (General fun items in English)"}.
Players: ${playerCount}.

Generate a list of exactly 6 items.
Respond strictly in JSON format:
{
  "items": [
    {
      "id": 1,
      "description": "Item description with staging instruction"
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
  const prompt = `You are the judge for a "Bring Me" game. 
Item: "${itemDescription}".
Evaluate the photo and award points 0-100.
Respond strictly in JSON:
{
  "points": number,
  "reason": "Short explanation"
}`;

  try {
    const data = await groqFetch({
      messages: [
        { role: "system", content: "You are a judge that outputs only JSON." },
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
      model: "llama-3.2-11b-vision-preview",
      response_format: { type: "json_object" }
    });
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Groq Vision Error:", error);
    return { points: 0, reason: "AI judge was busy. Next item!" };
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
