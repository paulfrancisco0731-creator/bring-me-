import { GoogleGenAI } from "@google/genai";

const API_KEY = "AIzaSyDA2JD3L3EIVOeAyeGEqPKQl19y5uuB12A";
// For client side usage, we can just use fetch or the SDK. We will use fetch to be safe against browser-environment restrictions in some SDK versions, or try SDK first.
// Actually, let's use the SDK.
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateItems = async (theme, playerCount) => {
  const prompt = `You are the game master for a Filipino "Bring Me" game called "Saan Mo Sya Dalhin".
Theme: ${theme === "Filipino Humor" ? "Filipino Humor (use Taglish, funny everyday items, lutong bahay, etc)" : "Random (General fun items in English)"}.
Players: ${playerCount}.

Generate a list of exactly 6 items.
Rules:
1. Every item MUST require live physical participation (cannot be googled or screenshotted).
2. MUST include a staging instruction (e.g., "Selfie habang hawak ang walis tingting na parang mikropono" or "Take a photo balancing a spoon on your nose").
3. Items must scale in difficulty (Item 1 is easiest, Item 6 is hardest).

Respond strictly in JSON format matching this schema:
{
  "items": [
    {
      "id": 1,
      "description": "Item description with staging instruction"
    }
  ]
}
Return only the JSON string, no markdown blocks.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating items:", error);
    return null;
  }
};

export const verifyPhoto = async (itemDescription, base64Image) => {
  const prompt = `You are the judge for a "Bring Me" game. 
The current item is: "${itemDescription}".

Check the provided photo against these 3 rules:
1. Does the photo match the item description?
2. Does it appear to be a live, real-world photo (not a screenshot, drawing, or downloaded image)?
3. Is the required participation proof/staging instruction visible in the frame?

Respond strictly in JSON format:
{
  "pass": true/false,
  "reason": "A short 1-sentence reason explaining why it passed or failed. Be funny and use Taglish if the item is Filipino-themed."
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Image.split(',')[1] || base64Image,
            mimeType: "image/jpeg"
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error verifying photo:", error);
    return { pass: false, reason: "Error verifying photo. Please try again." };
  }
};

export const generateRecap = async (gameData, theme) => {
  const prompt = `You are a funny commentator for a "Bring Me" game.
The game just ended. Here is the game data:
${JSON.stringify(gameData, null, 2)}

Write a personalized, funny post-game recap in the style of the chosen theme: ${theme}.
If Filipino Humor: Use Taglish, with kulit commentary per player (e.g., roast them for retakes, praise them for speed).
If Random: Witty English recap with playful roasting.
If it's a Solo game, focus on the player's personal performance, time, and failed attempts.

Keep it under 150 words.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating recap:", error);
    return "Wow, what a game! Everyone did great, but the AI commentator is currently speechless. 😂";
  }
};
