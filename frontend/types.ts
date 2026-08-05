export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
  role?: 'user' | 'admin';
  subscriptionExpiryDate?: number;
}

export interface Attachment {
  name: string;
  type: 'case' | 'format';
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachments?: Attachment[];
  isDocument?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface AppState {
  user: User | null;
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  usageSeconds: number;
  isTimeUp: boolean;
  language: string;
}
