
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { PathType, GeminiStoryResponse } from '../types';

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
      description: "A rich, detailed prompt for text-to-image generation, including environment, lighting, mood, and a semi-realistic, atmospheric style.",
    },
    animationDescription: {
      type: Type.STRING,
      description: "A 3-6 second cinematic animation description based on the image, including camera movement and atmospheric effects.",
    },
  },
  required: [
    "storyResult",
    "newQuestion",
    "choiceA",
    "choiceB",
    "speechNarrationStory",
    "speechNarrationAnswer",
    "imageGenerationPrompt",
    "animationDescription",
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
1.  **storyResult:** 2-4 sentences describing the outcome. Tone must match the path. Include vivid sensory details for image generation.
2.  **newQuestion:** A new, tension-building question for the player.
3.  **choiceA & choiceB:** Two distinct choices for the new question.
4.  **speechNarrationStory:** The storyResult, adapted for natural, emotional text-to-speech.
5.  **speechNarrationAnswer:** A short confirmation of the player's choice (e.g., "You chose to trust the machines.").
6.  **imageGenerationPrompt:** A detailed prompt for a semi-realistic, atmospheric image representing the story moment (include environment, light, mood).
7.  **animationDescription:** A description for a 3-6 second cinematic animation based on the image (camera moves, atmospheric effects).
`;

  try {
    const response = await ai.models.generateContent({
      // FIX: Use the recommended model name for gemini flash lite.
      model: "gemini-flash-lite-latest",
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


export const generateAnimation = async (imageBase64: string, prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: imageBase64,
            mimeType: 'image/jpeg',
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9',
        }
    });
    return operation;
  } catch (error: any) {
    console.error("Error generating animation:", error);
    if (error.message.includes("Requested entity was not found")) {
        throw new Error("API key not found or invalid. Please select a valid API key.");
    }
    throw new Error("Failed to start animation generation.");
  }
};

export const checkAnimationStatus = async (operation: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.operations.getVideosOperation({ operation: operation });
}

export const fetchVideo = async (uri: string): Promise<Blob> => {
    const response = await fetch(`${uri}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        throw new Error("Failed to fetch video data.");
    }
    return response.blob();
}
