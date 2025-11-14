
import { GoogleGenAI, Type } from "@google/genai";
import type { PathType, GeminiStoryResponse } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    newWorldSummary: {
      type: Type.STRING,
      description: "A new, very short (1 sentence) summary of the world state.",
    },
    storyResult: {
      type: Type.STRING,
      description: "A 2-4 sentence narrative describing the outcome of the player's choice.",
    },
    newQuestion: {
      type: Type.STRING,
      description: "A new, tense question for the player that presents a difficult choice with branching possibilities.",
    },
    choiceA: {
      type: Type.STRING,
      description: "The first choice (A) for the question.",
    },
    choiceB: {
      type: Type.STRING,
      description: "The second choice (B) for the question.",
    },
  },
  required: ["newWorldSummary", "storyResult", "newQuestion", "choiceA", "choiceB"],
};

export const generateStorySegment = async (
  worldSummary: string,
  playerChoice: string | null,
  pathType: PathType
): Promise<GeminiStoryResponse> => {
  const prompt = `You are a master storyteller creating a branching narrative in a world that oscillates between utopia and dystopia. Your tone should match the current path.

**Previous World Summary:** ${worldSummary}

**Player's Latest Choice:** ${playerChoice || 'This is the very beginning of the story.'}

**Current Path to Generate:** ${pathType.toUpperCase()}

**Your Task:**
Based on the previous summary and the player's choice, continue the story following the ${pathType} path. Generate the following in a JSON object:
1.  "newWorldSummary": A new, very short (1 sentence) summary of the world state.
2.  "storyResult": A 2-4 sentence narrative describing the outcome of the player's choice.
3.  "newQuestion": A new, tense question for the player that presents a difficult choice with branching possibilities.
4.  "choiceA": The first choice (A) for the question.
5.  "choiceB": The second choice (B) for the question.

Keep the story engaging and ensure the choices feel meaningful. The tone for a 'utopia' path should be hopeful, serene, or wondrous, even if there are underlying tensions. The tone for a 'dystopia' path should be grim, oppressive, or desperate.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.9,
      },
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as GeminiStoryResponse;
  } catch (error) {
    console.error("Error generating story segment:", error);
    throw new Error("Failed to generate the next part of the story. Please try again.");
  }
};
