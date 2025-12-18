
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem, ImageTheme } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const THEME_PROMPTS: Record<ImageTheme, string> = {
  modern: "professional food photography, studio lighting, clean minimalist background, sharp focus, 8k resolution.",
  scrivani: "editorial food photography in the style of Andrew Scrivani. Moody, high-contrast lighting with deep shadows (chiaroscuro effect). Rustic, dark matte backgrounds. Natural textures like wood or stone. Authentic, slightly messy-yet-perfect food styling. Rich, saturated earthy tones and high editorial quality.",
  pub: "warm dim lighting, dark oak wood table background, cozy tavern atmosphere, rustic plating, amber glow.",
  cafe: "bright and airy, natural daylight, white marble tabletop, blurry cafe background with coffee cups, fresh morning vibe.",
  bistro: "classic french bistro style, checkered tablecloth, elegant porcelain plating, sophisticated lighting, gourmet presentation.",
  nautical: "coastal kitchen vibe, weathered blue-washed wood, sea salt textures, rope accents, bright seaside light.",
  farm: "rustic farm-to-table aesthetic, burlap textures, raw ingredients like herbs and vegetables scattered nearby, natural sun-drenched lighting.",
  foodie: "extreme close-up macro photography, high contrast, focus on steam and glistening textures, artistic minimalist plating.",
  influencer: "vibrant saturated colors, trendy lifestyle props, shallow depth of field with beautiful bokeh, overhead or 45-degree 'instagrammable' angle."
};

export const generateFoodImage = async (itemName: string, itemDescription: string, theme: ImageTheme = 'modern'): Promise<string | null> => {
  try {
    const ai = getAI();
    const styleDescription = THEME_PROMPTS[theme] || THEME_PROMPTS.modern;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ 
          text: `A high-quality, appetizing professional food photography shot of ${itemName}. 
          The composition should clearly feature and visualize the following ingredients or components: ${itemDescription}.
          Style: ${styleDescription}
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
