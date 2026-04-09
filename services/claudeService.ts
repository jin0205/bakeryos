import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set.");
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

// SHARED NORMALIZATION PROMPT FRAGMENT
const NORMALIZATION_INSTRUCTIONS = `
### CRITICAL: UNIT NORMALIZATION HEURISTICS:
The app requires all weights in **GRAMS (g)**. Use the following conversion logic for less structured or non-metric text:

#### A. Standard Mass Conversions:
- 1 kg = 1000g
- 1 lb = 453.6g
- 1 oz = 28.35g
- 1 stone = 6350g

#### B. Volume-to-Weight (Density-Aware):
If an ingredient is given in cups, spoons, or milliliters, use these specific densities:
- **Liquids (Water, Milk, Cider, Beer)**: 1 cup ≈ 240g | 1 tbsp ≈ 15g | 1 tsp ≈ 5g | 1 ml ≈ 1g
- **Flours (All types)**: 1 cup ≈ 125g | 1 tbsp ≈ 8g
- **Sugars**: 1 cup Granulated ≈ 200g | 1 cup Brown (Packed) ≈ 215g | 1 tbsp ≈ 12g
- **Fats**: 1 cup Butter ≈ 227g | 1 stick Butter ≈ 113g | 1 cup Oil ≈ 218g
- **Honey/Syrups**: 1 cup ≈ 340g | 1 tbsp ≈ 21g
- **Salt (Fine)**: 1 tsp ≈ 6g | 1 tbsp ≈ 18g
- **Yeast (Instant/Dry)**: 1 tsp ≈ 3g | 1 tbsp ≈ 9g

#### C. Informal/Culinary Units:
- **"Pinch" or "Dash"**: 1g
- **"Smidgen"**: 0.5g
- **"Large Egg"**: 50g (shelled)
- **"Clove of Garlic"**: 5g
- **"Medium Onion"**: 150g
- **"Half a bag/packet"**: Estimate based on standard retail sizes.

#### D. Percentage-Only Recipes:
- If only Baker's Percentages are provided, assume a Total Flour Weight of 1000g.
`;

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

function extractText(response: Anthropic.Message): string {
  const block = response.content.find(b => b.type === 'text');
  return block?.type === 'text' ? block.text : '';
}

export const analyzeImage = async (imageFile: File, prompt: string): Promise<string> => {
  try {
    const base64 = await fileToBase64(imageFile);
    const mediaType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    });
    return extractText(response) || "No analysis available.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "Sorry, I couldn't analyze the image. Please try again.";
  }
};

export const parseRecipePdf = async (pdfFile: File): Promise<string> => {
  try {
    const base64 = await fileToBase64(pdfFile);
    const prompt = `
You are a highly precise data extraction assistant for a professional bakery application.
Extract the recipe details from this PDF.

{
  "name": "string",
  "numberOfLoaves": number,
  "weightPerLoaf": number,
  "ingredients": [
    { "name": "string", "weight": number }
  ]
}

${NORMALIZATION_INSTRUCTIONS}
Return ONLY valid JSON.
`;
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    });
    return extractText(response) || "{}";
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF.");
  }
};

export const parseRecipeText = async (text: string): Promise<string> => {
  try {
    const prompt = `
Extract recipe details from the following raw text or CSV data (likely from a Google Sheet or clipboard):

INPUT DATA:
"""
${text}
"""

OUTPUT FORMAT:
{
  "name": "string",
  "numberOfLoaves": number,
  "weightPerLoaf": number,
  "ingredients": [
    { "name": "string", "weight": number }
  ]
}

${NORMALIZATION_INSTRUCTIONS}
Return ONLY valid JSON.
`;
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    return extractText(response) || "{}";
  } catch (error) {
    console.error("Error parsing text:", error);
    throw new Error("Failed to parse input data.");
  }
};

export const getGroundedResponse = async (prompt: string): Promise<{ text: string; metadata?: { groundingChunks: [] } }> => {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    return {
      text: extractText(response) || "No response generated.",
      metadata: { groundingChunks: [] },
    };
  } catch (error) {
    console.error("Error getting response:", error);
    return { text: "Sorry, I couldn't get a response. Please check the console for details." };
  }
};

export const getComplexResponse = async (prompt: string): Promise<string> => {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 10000 },
      messages: [{ role: 'user', content: prompt }],
    });
    return extractText(response) || "No response generated.";
  } catch (error) {
    console.error("Error getting complex response:", error);
    return "Sorry, I encountered an issue with the advanced query. Please try again.";
  }
};

export const getRecipeSuggestions = async (recipeContext: string, goal: string): Promise<string> => {
  try {
    const prompt = `
Act as a world-class master baker and food scientist.

Current Recipe Context:
${recipeContext}

User Goal: "${goal}"

Based on the goal, suggest specific modifications to the ingredient percentages, new ingredients to add, or process changes.
Provide the reasoning (baking science) for each suggestion.
Format the response in Markdown.
`;
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    return extractText(response) || "No suggestions generated.";
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return "Sorry, I couldn't generate suggestions at this time.";
  }
};

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export async function getChatResponse(
  history: ChatTurn[],
  systemInstruction: string
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemInstruction,
      messages: history,
    });
    return extractText(response) || "No response generated.";
  } catch (error) {
    console.error("Error getting chat response:", error);
    return "Sorry, I couldn't get a response. Please try again.";
  }
}

export interface BrainstormedRecipeJSON {
  name: string;
  description: string;
  numberOfLoaves: number;
  weightPerLoaf: number;
  targetLoafWeight: number;
  flours: { name: string; percentage: number; weight: number }[];
  ingredients: { name: string; percentage: number; weight: number }[];
}

export const brainstormRecipe = async (
  description: string,
  totalFlourWeight: number = 1000
): Promise<BrainstormedRecipeJSON> => {
  const prompt = `
You are a world-class master baker and food scientist specializing in artisan sourdough bread.

A baker has described a recipe idea:
"${description}"

Generate a complete sourdough recipe using Baker's Percentages based on a total flour weight of ${totalFlourWeight}g.

CLASSIFICATION RULES:
- "flours" array: ALL dry grain ingredients only (bread flour, whole wheat, rye, spelt, einkorn, semolina, etc.)
- "ingredients" array: ALL other components (water, salt, levain/starter, honey, seeds, oil, add-ins, etc.)
- Flour percentages must sum to exactly 100%
- All other ingredient percentages are relative to total flour weight (Baker's %)

SOURDOUGH REQUIREMENTS:
- Always include Levain (or Starter) as an ingredient, typically 15-25% unless described otherwise
- Always include Water and Salt
- Hydration (water %) should match the described style: slack/open-crumb ~75-85%, standard ~68-75%, firm ~60-68%
- Salt is typically 1.8-2.2%

BATCH SIZE:
- numberOfLoaves: 1-4 loaves (choose a sensible small batch)
- weightPerLoaf and targetLoafWeight: calculate as total dough weight / numberOfLoaves

${NORMALIZATION_INSTRUCTIONS}

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "name": "descriptive recipe name",
  "description": "1-2 sentence flavor profile and baking note",
  "numberOfLoaves": number,
  "weightPerLoaf": number,
  "targetLoafWeight": number,
  "flours": [
    { "name": "string", "percentage": number, "weight": number }
  ],
  "ingredients": [
    { "name": "string", "percentage": number, "weight": number }
  ]
}

Where each weight = (percentage / 100) * ${totalFlourWeight}
`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = extractText(response) || '{}';
    try {
      return JSON.parse(text) as BrainstormedRecipeJSON;
    } catch {
      throw new Error('AI returned an unreadable response. Please try again.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('unreadable')) throw error;
    console.error('Error brainstorming recipe:', error);
    throw new Error('Failed to generate recipe. Please check your connection and try again.');
  }
};

export const suggestIngredientCost = async (ingredientName: string): Promise<number | null> => {
  try {
    const prompt = `
Estimate the average bulk market price for "${ingredientName}" per kilogram (kg) in USD for a commercial bakery.

Use your knowledge of typical bakery ingredient pricing. If you're uncertain, provide a conservative estimate.

Return ONLY a single numeric value representing the price in USD/kg.
Do not include symbols ($), text, or markdown. Just the number (e.g., 2.50).
If no price can be confidently estimated, return 0.
`;
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = extractText(response) || "";
    const match = text.match(/[\d.]+/);
    if (match) {
      const price = parseFloat(match[0]);
      return isNaN(price) ? null : price;
    }
    return null;
  } catch (error) {
    console.error("Error suggesting cost:", error);
    return null;
  }
};
