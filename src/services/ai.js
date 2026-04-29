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
  const seed = Math.random().toString(36).substring(2, 8);
  const isFilipino = theme.toLowerCase().includes('filipino');

  const prompt = isFilipino
    ? `Ikaw ang game master ng "Saan Mo Sya Dalhin" - isang Filipino party game.

Seed (para random): ${seed}

Gumawa ng EXACTLY 6 na iba't ibang items. Bawat item ay isang bagay na makikita sa karaniwang bahay ng Pilipino (hal: balde, posporo, kutsilyo, payong, sipit, basahan, kandila, medyas, sinturon, higaan, unan, timba, plorera, kaldero, etc.).

RULES:
1. HUWAG gamitin ang: walis tingting, toothbrush, sandok, remote, hanger. Pumili ng IBANG bagay.
2. Bawat item ay may kasamang nakakatawang aksiyon o paraan ng pagdadala (hal: "Unan na nakasuot sa ulo bilang sombrero", "Medyas na nakasabit sa tainga").
3. Taglish ang language. Maging creative at nakakatawa!
4. Gawing unpredictable at random ang listahan.

Sagot sa JSON format:
{
  "items": [
    { "id": 1, "description": "Object + Silly action" }
  ]
}`
    : `You are the game master for "Bring Me!". Seed: ${seed}.

Generate EXACTLY 6 random household items with silly actions. Be creative and unpredictable!

Respond in JSON: { "items": [{ "id": 1, "description": "Item + Action" }] }`;

  try {
    const data = await groqFetch({
      messages: [
        { role: 'system', content: 'You are a creative party game host. Output only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 1.2 // max creativity
    });
    const parsed = JSON.parse(data.choices[0].message.content);
    // Shuffle for extra randomness
    if (parsed.items) {
      parsed.items = parsed.items.sort(() => Math.random() - 0.5);
    }
    return parsed;
  } catch (error) {
    console.error('Groq Text Error:', error);
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
