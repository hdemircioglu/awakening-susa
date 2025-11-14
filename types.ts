
export type PathType = 'utopia' | 'dystopia';

export interface StoryChoice {
  a: string;
  b: string;
}

export interface StorySegment {
  id: string;
  path: PathType;
  
  // Text content
  result: string;
  question: string; // The question that *led* to this segment
  choices: StoryChoice; // The choices that *led* to this segment

  // AI-generated prompts for other media
  imagePrompt: string;
  animationDescription: string;
  
  // Base64 data for processing
  imageBase64?: string;
  storyAudioBase64?: string;
  
  // URLs for generated media
  imageUrl?: string;
  animationUrl?: string;
  
  // State for async operations
  isAnimating?: boolean;
  animationError?: string;
}

export interface GeminiStoryResponse {
  storyResult: string;
  newQuestion: string;
  choiceA: string;
  choiceB: string;
  speechNarrationStory: string;
  speechNarrationAnswer: string;
  imageGenerationPrompt: string;
  animationDescription: string;
}
