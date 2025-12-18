
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem } from "../types";

// Fix: Strictly use process.env.API_KEY for initialization as per guidelines
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFoodImage = async (itemName: string, itemDescription: string, themePrompt: string): Promise<string | null> => {
  try {
    const ai = getAI();
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ 
          text: `A high-quality, appetizing professional food photography shot of ${itemName}. 
          The composition should clearly feature and visualize the following ingredients or components: ${itemDescription}.
          Style: ${themePrompt}
          Format: 16:9 vertical orientation. 
          CRITICAL: ABSOLUTELY NO TEXT, no labels, no prices, no logos, and no watermarks in the image. Pure photography only.` 
        }],
      },
      config: {
        imageConfig: {
          aspectRatio: "9:16",
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

export const improveDescription = async (itemName: string, currentDescription: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional menu copywriter for a high-end deli. 
      Rewrite the following item description to be more appetizing, evocative, and persuasive. 
      Keep it under 15 words. Focus on freshness and quality.
      Item: ${itemName}
      Original: ${currentDescription}`,
    });
    return response.text.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Error improving description:", error);
    return currentDescription;
  }
};

export const extractMenuItemsFromImage = async (base64Image: string): Promise<MenuItem[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1],
            },
          },
          { text: 'Extract all menu items, their descriptions/ingredients, and their prices from this menu image. Format the output as a JSON array of objects with keys: name, description, price.' }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              price: { type: Type.STRING },
            },
            required: ['name', 'description', 'price']
          }
        }
      }
    });

    return JSON.parse(response.text) as MenuItem[];
  } catch (error) {
    console.error("Error extracting menu items:", error);
    return [];
  }
};
