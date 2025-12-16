
export enum Personality {
  ROAST = 'ROAST',
  ROMAN = 'ROMAN',
  BIG_BRO = 'BIG_BRO',
  LITTLE_SIS = 'LITTLE_SIS',
  ASSISTANT = 'ASSISTANT',
  THERAPIST = 'THERAPIST',
  CODER = 'CODER',
  CHEF = 'CHEF',
  GF = 'GF',
  BF = 'BF',
  TRADER = 'TRADER',
  RIZZER = 'RIZZER',
  YOUTUBER = 'YOUTUBER',
  FUN = 'FUN',
  GAMER = 'GAMER'
}

export interface User {
  name: string;
  age: string;
  bio: string;
  email: string;
  gender: string;
  avatar: string;
  theme: 'dark' | 'light';
  isLoggedIn: boolean;
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64 string
  fileName?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachment?: Attachment;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface AudioVisualizerState {
  volume: number;
}
