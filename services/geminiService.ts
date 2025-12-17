import { GoogleGenAI } from "@google/genai";
import { GEMINI_SYSTEM_INSTRUCTION } from '../constants';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const askMenuAssistant = async (question: string): Promise<{text: string, sources?: any[]}> => {
  try {
    if (!process.env.API_KEY) {
      return { text: "System offline (Missing API Key). Please WhatsApp us directly! 🍔" };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        temperature: 0.7,
        tools: [{ googleSearch: {} }], // Enable Search for location/hours
      },
    });

    const text = response.text || "Sorry, I'm flipping burgers and missed that. Say again?";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    return { text, sources };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Sorry, connection error. Please order via WhatsApp!" };
  }
};