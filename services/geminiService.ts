import { GoogleGenAI } from "@google/genai";

// Initialize the client. 
// Note: In a real production app, ensure API keys are handled securely.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateChatResponse = async (
  history: { role: string; text: string }[],
  context: string,
  userMessage: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    // Construct the prompt with context
    const systemInstruction = `You are a helpful assistant integrated into a document management system. 
    You have access to the content of the document the user is currently viewing. 
    Use the provided Document Content to answer the user's questions. 
    If the answer is not in the document, state that clearly.
    
    Document Content:
    """
    ${context}
    """`;

    // Format history for the API
    // The @google/genai SDK might handle chat history differently, 
    // but for a simple single-turn or managed history, we can use generateContent with the instruction.
    // For true chat, we use chats.create, but here we'll pass context dynamically per request for simplicity 
    // or use the chat helper if we want to maintain session state easily.
    
    // Using chat helper for session consistency if we were persisting the chat object, 
    // but for this stateless service function, let's use a fresh chat or generateContent.
    // To keep it robust with the provided context which might change (if user switches versions),
    // we will treat each message as a fresh generation with history included in the prompt or structure.
    
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text || "I couldn't generate a response.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while processing your request. Please check your API key.";
  }
};
