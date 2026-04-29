import Groq from "groq-sdk";

const API_KEY = "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";
const groq = new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true });

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
Return only the JSON string.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs only JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });
    const content = chatCompletion.choices[0].message.content;
    console.log("Groq Response:", content);
    return JSON.parse(content);
  } catch (error) {
    console.error("Detailed Groq Error:", error);
    // Fallback or re-throw
    return null;
  }
};

export const verifyPhoto = async (itemDescription, base64Image) => {
  const prompt = `You are the judge for a "Bring Me" game. 
The current item is: "${itemDescription}".

Evaluate the provided photo and award points from 0 to 100 based on these criteria:
1. Accuracy: Does the photo match the item description perfectly? (e.g. if it asks for a spoon on the nose, and it's just on the face, give partial points like 50).
2. Authenticity: Does it appear to be a live, real-world photo (not a screenshot or downloaded image)? (Give 0 points if it's fake).
3. Effort/Proof: Is the required participation proof/staging instruction clearly visible?

Respond strictly in JSON format:
{
  "points": number,
  "reason": "A short 1-sentence reason explaining the score. Be funny and use Taglish if the item is Filipino-themed."
}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      model: "llama-3.2-11b-vision-preview",
      response_format: { type: "json_object" },
    });
    return JSON.parse(chatCompletion.choices[0].message.content);
  } catch (error) {
    console.error("Error verifying photo with Groq Vision:", error);
    return { points: 0, reason: "Error verifying photo. Please try again." };
  }
};

export const generateRecap = async (gameData, theme) => {
  const prompt = `You are a funny commentator for a "Bring Me" game.
The game just ended. Here is the game data (players, their scores/points, and items completed):
${JSON.stringify(gameData, null, 2)}

Write a personalized, funny post-game recap in the style of the chosen theme: ${theme}.
The game is points-based (highest score wins).
If Filipino Humor: Use Taglish, with kulit commentary per player (e.g., roast them for low points or praise their perfect 100 scores).
If Random: Witty English recap with playful roasting.
If it's a Solo game, focus on the player's personal performance and points achieved.

Keep it under 150 words.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
    });
    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error("Error generating recap with Groq:", error);
    return "Wow, what a game! Everyone did great, but the AI commentator is currently speechless. 😂";
  }
};
