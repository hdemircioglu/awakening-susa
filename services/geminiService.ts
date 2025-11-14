import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { PathType, GeminiStoryResponse, HiddenObjectLocation } from '../types';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    storyResult: {
      type: Type.STRING,
      description: "2-4 sentences describing the story outcome with vivid sensory details.",
    },
    newQuestion: {
      type: Type.STRING,
      description: "A new, thought-provoking question about the world's future.",
    },
    choiceA: { type: Type.STRING, description: "The first choice (A)." },
    choiceB: { type: Type.STRING, description: "The second choice (B)." },
    speechNarrationStory: {
      type: Type.STRING,
      description: "The story result, rewritten for natural, emotional text-to-speech narration.",
    },
    speechNarrationAnswer: {
      type: Type.STRING,
      description: "A short, spoken confirmation of the player's choice (e.g., 'You chose to...').",
    },
    imageGenerationPrompt: {
      type: Type.STRING,
      description: "A rich, detailed prompt for text-to-image generation. This prompt MUST include the object from hiddenObjectName at the location specified by hiddenObjectLocation.",
    },
    hiddenObjectName: {
      type: Type.STRING,
      description: "The name of a single, small, thematically relevant object to hide in the scene."
    },
    hiddenObjectLocation: {
        type: Type.STRING,
        description: "The location to hide the object. MUST be one of: 'top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'."
    }
  },
  required: [
    "storyResult",
    "newQuestion",
    "choiceA",
    "choiceB",
    "speechNarrationStory",
    "speechNarrationAnswer",
    "imageGenerationPrompt",
    "hiddenObjectName",
    "hiddenObjectLocation",
  ],
};

export const generateStorySegment = async (
  worldSummary: string,
  playerChoice: string | null,
  pathType: PathType
): Promise<GeminiStoryResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `You are the narrative engine of a branching story game.
**World Summary:** ${worldSummary}
**Player's Choice:** ${playerChoice || 'This is the very beginning of the story.'}
**Assigned Path:** ${pathType.toUpperCase()}

Generate ALL of the following outputs in a JSON object:
1.  **storyResult:** 2-4 sentences describing the outcome. Tone must match the path.
2.  **newQuestion:** A new, tension-building question for the player.
3.  **choiceA & choiceB:** Two distinct choices for the new question.
4.  **speechNarrationStory:** The storyResult, adapted for natural, emotional text-to-speech.
5.  **speechNarrationAnswer:** A short confirmation of the player's choice.
6.  **Hidden Object:** Invent a single, small, thematically relevant object to hide in the scene.
7.  **hiddenObjectName:** The name of this object.
8.  **hiddenObjectLocation:** The location to hide it. Must be one of nine zones: 'top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'.
9.  **imageGenerationPrompt:** A detailed prompt for a semi-realistic, atmospheric image. CRITICAL: This prompt must subtly include the 'hiddenObjectName' at the specified 'hiddenObjectLocation'. For example, if the object is a 'cracked data chip' and location is 'bottom-right', the prompt could contain '...in the bottom-right corner, half-buried in the dust, lies a cracked data chip.'
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.9,
      },
    });
    
    const jsonText = response.text.trim();
    // A little bit of resilience against the model returning a non-compliant location
    const parsed = JSON.parse(jsonText);
    const validLocations = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
    if (!validLocations.includes(parsed.hiddenObjectLocation)) {
      console.warn(`Invalid location "${parsed.hiddenObjectLocation}" received, defaulting to "middle-center".`);
      parsed.hiddenObjectLocation = 'middle-center';
    }
    return parsed as GeminiStoryResponse;
  } catch (error) {
    console.error("Error generating story segment:", error);
    throw new Error("Failed to generate the next part of the story.");
  }
};

export const generateSpeech = async (textToSpeak: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data returned from API.");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to generate narration.");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '16:9',
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("No image data returned from API.");
    }
    return base64ImageBytes;
  } catch(error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate scene image.");
  }
};