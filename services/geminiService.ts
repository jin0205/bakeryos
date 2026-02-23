
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GeminiGroundedResponse, GroundingChunk } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string; }; }> {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
}

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

// Updated model to gemini-3-flash-preview for basic text and vision tasks
export const analyzeImage = async (imageFile: File, prompt: string): Promise<string> => {
  try {
    const imagePart = await fileToGenerativePart(imageFile);
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [imagePart, { text: prompt }] },
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "Sorry, I couldn't analyze the image. Please try again.";
  }
};

export const parseRecipePdf = async (pdfFile: File): Promise<string> => {
    try {
        const pdfPart = await fileToGenerativePart(pdfFile);
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

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [pdfPart, { text: prompt }] },
            config: { responseMimeType: 'application/json' }
        });
        
        return response.text || "{}";
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

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        
        return response.text || "{}";
    } catch (error) {
        console.error("Error parsing text:", error);
        throw new Error("Failed to parse input data.");
    }
};

// Updated model to gemini-3-flash-preview for search grounding
export const getGroundedResponse = async (prompt: string): Promise<GeminiGroundedResponse> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
        
        return {
            text: response.text || "No response generated.",
            metadata: {
                groundingChunks: groundingChunks || [],
            }
        };
    } catch (error) {
        console.error("Error getting grounded response:", error);
        return { text: "Sorry, I couldn't get a response. Please check the console for details." };
    }
};


// Updated model to gemini-3-pro-preview for complex reasoning tasks
export const getComplexResponse = async (prompt: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 1024 } // Thinking budget for Gemini 3 series
            },
        });
        return response.text || "No response generated.";
    } catch (error) {
        console.error("Error getting complex response:", error);
        return "Sorry, I encountered an issue with the advanced query. Please try again.";
    }
};

// Updated model to gemini-3-flash-preview
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
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Fast response
            contents: prompt,
        });
        
        return response.text || "No suggestions generated.";
    } catch (error) {
        console.error("Error getting suggestions:", error);
        return "Sorry, I couldn't generate suggestions at this time.";
    }
};

type ChatTurn = { role: 'user' | 'model'; parts: [{ text: string }] };

export async function getChatResponse(
  history: ChatTurn[],
  systemInstruction: string
): Promise<string> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview',
      contents: history,
      config: { systemInstruction },
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Error getting chat response:", error);
    return "Sorry, I couldn't get a response. Please try again.";
  }
}

// Updated model to gemini-3-flash-preview for search grounding tasks
export const suggestIngredientCost = async (ingredientName: string): Promise<number | null> => {
    try {
        const prompt = `
        Search for the current average bulk market price for "${ingredientName}" per kilogram (kg) in USD.
        
        Analyze the search results to find a realistic price for a bakery ingredient.
        If the results show a range, calculate a conservative average.
        
        Return ONLY a single numeric value representing the price in USD/kg. 
        Do not include symbols ($), text, or markdown. Just the number (e.g., 2.50).
        If no price can be confidently determined, return 0.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        
        const text = response.text || "";
        // Clean up response to find the number
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
