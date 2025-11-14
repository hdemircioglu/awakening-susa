export type PathType = 'utopia' | 'dystopia';

export type HiddenObjectLocation = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

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
  nextQuestion: string; // The question to be asked *after* this segment's game is won
  nextChoices: StoryChoice; // The choices for the next question

  // AI-generated prompts for other media
  imagePrompt: string;
  
  // Base64 data for processing
  storyAudioBase64?: string;
  
  // URLs for generated media
  imageUrl?: string;

  // Hidden Object Game
  hiddenObjectName?: string;
  hiddenObjectLocation?: HiddenObjectLocation;
  isObjectFound?: boolean;
}

export interface GeminiStoryResponse {
  storyResult: string;
  newQuestion: string;
  choiceA: string;
  choiceB: string;
  speechNarrationStory: string;
  speechNarrationAnswer: string;
  imageGenerationPrompt: string;
  hiddenObjectName: string;
  hiddenObjectLocation: HiddenObjectLocation;
}