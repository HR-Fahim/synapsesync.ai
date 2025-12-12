export type SubscriptionTier = 'FREE' | 'PRO' | 'PREMIUM';

export interface User {
  id: string;
  name: string;
  email: string;
  tier: SubscriptionTier;
  editsUsed: number;
  lastEditReset: string; // ISO String for tracking weekly reset
  autoUpdateInterval: number; // Days
}

export interface FileVersion {
  id: string;
  timestamp: string; // ISO String
  content: string;
  versionLabel: string;
}

export interface DocFile {
  id: string;
  title: string;
  type: 'doc' | 'sheet' | 'text';
  currentContent: string;
  lastUpdated: string;
  versions: FileVersion[];
  ownerId: string;
  currentVersionId: string;
  autoUpdateEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum ViewState {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  FILE_DETAIL = 'FILE_DETAIL',
  GOOGLE_SIGNIN = 'GOOGLE_SIGNIN',
  FILE_PICKER = 'FILE_PICKER',
  SUBSCRIPTION = 'SUBSCRIPTION'
}