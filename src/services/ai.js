const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
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
    ? `Ikaw ang game master ng "Saan Mo Sya Dalhin".
Seed: ${seed}

Pumili ng EXACTLY 6 na items mula sa listahang ito ng karaniwang gamit sa bahay ng Pilipino:
tabo, payong, unan, medyas, sinturon, wallet, baso, plato, kutsara, tinidor, plantsa, halong kahoy, bote ng toyo, basahan, tela/kumot, sipit, balde, kandila, kutsilyo, step stool/maliliit na upuan, pitsel, thermos, kahit anong gamit sa kusina, panligo/shampoo, toothbrush, sapatos/tsinelas, relo, sombrero, bag/bag-bag, belt, suklay, salamin, libro, ballpen, cellphone case, kulambo, extension cord, rubber band.

Para sa bawat item, gumawa ng NAKAKATAWA at MADALING gawin na aksiyon gamit ang item (hal: "Tabo na nakasuot sa ulo bilang helmet", "Medyas na nakahawak sa ilong mo", "Unan na niyayakap mo tulad ng boyfriend/girlfriend", "Balde na nakalagay sa ulo mo tulad ng sombrero").

RULES:
- Gamitin ang IBA'T IBANG items, huwag paulit-ulit
- Ang aksiyon ay dapat madaling gawin sa loob ng bahay
- Maging masaya at creative!
- Taglish ang pagsulat

JSON format:
{
  "items": [
    { "id": 1, "description": "Item na [nakakatawang aksiyon]" }
  ]
}`
    : `You are the game master for "Bring Me!". Seed: ${seed}.
Generate EXACTLY 6 random everyday household items with funny actions.
JSON: { "items": [{ "id": 1, "description": "Item + funny action" }] }`;

  try {
    const data = await groqFetch({
      messages: [
        { role: 'system', content: 'You are a fun Filipino party game host. Output only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 1.1
    });
    const parsed = JSON.parse(data.choices[0].message.content);
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
