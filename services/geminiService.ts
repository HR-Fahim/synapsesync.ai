import { GoogleGenAI } from "@google/genai";

// Initialize the client. 
// Note: In a real production app, ensure API keys are handled securely.
// Using a safe fallback if process.env.API_KEY is missing, though it usually shouldn't be.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateChatResponse = async (
  history: { role: string; text: string }[],
  context: string,
  userMessage: string
): Promise<string> => {
  try {
    // Using gemini-2.5-flash as the default model for text tasks as per guidelines.
    const model = 'gemini-2.5-flash';
    
    // Construct the prompt with context
    // We add strict instructions to avoid hallucinations and stay on topic.
    const systemInstruction = `You are a helpful assistant integrated into a document management system. 
    You have access to the content of the document the user is currently viewing. 
    Use the provided Document Content to answer the user's questions. 
    If the answer is not in the document, state that clearly unless it's a general question about the document type.
    Format your response using Markdown (bold, lists, code blocks) for better readability.
    
    Document Content:
    """
    ${context}
    """`;

    // Format history for the API
    // Ensure roles are mapped correctly if the internal type differs from API expectations (user/model).
    const apiHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
      },
      history: apiHistory,
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text || "I couldn't generate a response.";

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Provide a more user-friendly error message if possible
    if (error.message?.includes("API key")) {
        return "Configuration Error: Missing or invalid API key.";
    }
    
    return "Sorry, I encountered an error while processing your request. Please try again later.";
  }
};