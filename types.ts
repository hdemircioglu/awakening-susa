
export type PathType = 'utopia' | 'dystopia';

export interface StoryChoice {
  a: string;
  b: string;
}

export interface StorySegment {
  id: string;
  result: string;
  question: string;
  choices: StoryChoice;
  path: PathType;
}

export interface GeminiStoryResponse {
  newWorldSummary: string;
  storyResult: string;
  newQuestion: string;
  choiceA: string;
  choiceB: string;
}
