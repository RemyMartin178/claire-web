import { auth } from './firebase'
import { getApiBase } from './http'
import { FirestoreUserService, FirestoreSessionService, FirestoreTranscriptService, FirestoreAiMessageService, FirestoreSummaryService, FirestorePromptPresetService } from './firestore'
import { Timestamp } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'

declare global {
  interface Window {
    __API_URL__?: string;
  }
}

export interface UserProfile {
  uid: string;
  display_name: string;
  email: string;
}

export interface Session {
  id: string;
  uid: string;
  title: string;
  session_type: string;
  started_at: number;
  ended_at?: number;
  sync_state: 'clean' | 'dirty';
  updated_at: number;
}

export interface Transcript {
  id: string;
  session_id: string;
  start_at: number;
  end_at?: number;
  speaker?: string;
  text: string;
  lang?: string;
  created_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface AiMessage {
  id: string;
  session_id: string;
  sent_at: number;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  model?: string;
  created_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface Summary {
  session_id: string;
  generated_at: number;
  model?: string;
  text: string;
  tldr: string;
  bullet_json: string;
  action_json: string;
  tokens_used?: number;
  updated_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface PromptPreset {
  id: string;
  uid: string;
  title: string;
  prompt: string;
  is_default: 0 | 1;
  created_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface SessionDetails {
    session: Session;
    transcripts: Transcript[];
    ai_messages: AiMessage[];
    summary: Summary | null;
}

const isFirebaseMode = (): boolean => {
  return true; // Always use Firebase mode
};

const timestampToUnix = (timestamp: Timestamp): number => {
  return timestamp.toMillis();
};

const unixToTimestamp = (unix: number): Timestamp => {
  return Timestamp.fromMillis(unix);
};

const convertFirestoreSession = (session: { id: string } & any, uid: string): Session => {
  return {
    id: session.id,
    uid,
    title: session.title,
    session_type: session.session_type,
    started_at: timestampToUnix(session.startedAt),
    ended_at: session.endedAt ? timestampToUnix(session.endedAt) : undefined,
    sync_state: 'clean',
    updated_at: timestampToUnix(session.startedAt)
  };
};

const convertFirestoreTranscript = (transcript: { id: string } & any): Transcript => {
  return {
    id: transcript.id,
    session_id: transcript.id,
    start_at: timestampToUnix(transcript.startAt),
    end_at: timestampToUnix(transcript.endAt),
    speaker: transcript.speaker,
    text: transcript.text,
    lang: transcript.lang,
    created_at: timestampToUnix(transcript.createdAt),
    sync_state: 'clean'
  };
};

const convertFirestoreAiMessage = (message: { id: string } & any): AiMessage => {
  return {
    id: message.id,
    session_id: message.id,
    sent_at: timestampToUnix(message.sentAt),
    role: message.role,
    content: message.content,
    tokens: message.tokens,
    model: message.model,
    created_at: timestampToUnix(message.createdAt),
    sync_state: 'clean'
  };
};

const convertFirestoreSummary = (summary: any, sessionId: string): Summary => {
  return {
    session_id: sessionId,
    generated_at: timestampToUnix(summary.generatedAt),
    model: summary.model,
    text: summary.text,
    tldr: summary.tldr,
    bullet_json: JSON.stringify(summary.bulletPoints),
    action_json: JSON.stringify(summary.actionItems),
    tokens_used: summary.tokensUsed,
    updated_at: timestampToUnix(summary.generatedAt),
    sync_state: 'clean'
  };
};

const convertFirestorePreset = (preset: { id: string } & any, uid: string): PromptPreset => {
  return {
    id: preset.id,
    uid,
    title: preset.title,
    prompt: preset.prompt,
    is_default: preset.isDefault ? 1 : 0,
    created_at: timestampToUnix(preset.createdAt),
    sync_state: 'clean'
  };
};

// In prod, rely on NEXT_PUBLIC_API_URL; fallback to host-based heuristic
const initializeApiUrl = async () => {};

export const getUserInfo = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('userInfo');
  return stored ? JSON.parse(stored) : null;
};

export const setUserInfo = (userInfo: UserProfile | null, skipEvents: boolean = false) => {
  if (typeof window === 'undefined') return;
  
  if (userInfo) {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  } else {
    localStorage.removeItem('userInfo');
  }
  
  if (!skipEvents) {
    window.dispatchEvent(new CustomEvent('userInfoChanged', { detail: userInfo }));
  }
};

export const onUserInfoChange = (listener: (userInfo: UserProfile | null) => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (event: CustomEvent) => listener(event.detail);
  window.addEventListener('userInfoChanged', handler as EventListener);
  return () => window.removeEventListener('userInfoChanged', handler as EventListener);
};

export const getApiHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (typeof window !== 'undefined' && window.__API_URL__) {
    headers['X-API-URL'] = window.__API_URL__;
  }
  
  return headers;
};

export const apiCall = async (path: string, options: RequestInit = {}) => {
  const baseUrl = getApiBase();
  
  const url = `${baseUrl}${path}`;
  const config: RequestInit = {
    ...options,
    headers: {
      ...getApiHeaders(),
      ...options.headers,
    },
  };
  
  return fetch(url, config);
};

export const searchConversations = async (query: string): Promise<Session[]> => {
  if (isFirebaseMode()) {
    const sessions = await getSessions();
    return sessions.filter(session => 
      session.title.toLowerCase().includes(query.toLowerCase())
    );
  } else {
    const response = await apiCall(`/api/sessions/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search conversations');
    return response.json();
  }
};

export const getSessions = async (): Promise<Session[]> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    const firestoreSessions = await FirestoreSessionService.getSessions(uid);
    return firestoreSessions.map(session => convertFirestoreSession(session, uid));
  } else {
    const response = await apiCall('/api/sessions');
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  }
};

export const getSessionDetails = async (sessionId: string): Promise<SessionDetails> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    const session = await FirestoreSessionService.getSession(uid, sessionId);
    if (!session) throw new Error('Session not found');
    
    const transcripts = await FirestoreTranscriptService.getTranscripts(uid, sessionId);
    const aiMessages = await FirestoreAiMessageService.getAiMessages(uid, sessionId);
    const summary = await FirestoreSummaryService.getSummary(uid, sessionId);
    
    return {
      session: convertFirestoreSession({ id: sessionId, ...session }, uid),
      transcripts: transcripts.map(convertFirestoreTranscript),
      ai_messages: aiMessages.map(convertFirestoreAiMessage),
      summary: summary ? convertFirestoreSummary(summary, sessionId) : null
    };
  } else {
    const response = await apiCall(`/api/sessions/${sessionId}`);
    if (!response.ok) throw new Error('Failed to fetch session details');
    return response.json();
  }
};

export const createSession = async (title?: string): Promise<{ id: string }> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    const sessionId = await FirestoreSessionService.createSession(uid, {
      title: title || 'New Session',
      session_type: 'conversation'
    });
    return { id: sessionId };
  } else {
    const response = await apiCall('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Session' }),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    await FirestoreSessionService.deleteSession(uid, sessionId);
  } else {
    const response = await apiCall(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete session');
  }
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  if (isFirebaseMode()) {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    
    try {
      const firestoreProfile = await FirestoreUserService.getUser(user.uid);
      
      if (!firestoreProfile) {
        return null;
      }
      
      const userProfile = {
        uid: user.uid,
        display_name: firestoreProfile.displayName || user.displayName || 'User',
        email: firestoreProfile.email || user.email || 'no-email@example.com'
      };
      
      return userProfile;
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      return null;
    }
  } else {
    try {
      const response = await apiCall('/api/user/profile', { method: 'GET' });
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error('getUserProfile: API call failed:', error);
      return null;
    }
  }
};

export const updateUserProfile = async (data: { displayName: string }): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    await FirestoreUserService.updateUser(uid, { displayName: data.displayName });
  } else {
    const response = await apiCall('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user profile');
  }
};

export const findOrCreateUser = async (user: UserProfile): Promise<UserProfile> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    try {
      // Attendre que l'utilisateur soit complètement authentifié
      await auth.currentUser?.getIdToken(true);
      
      console.log('Creating Firestore profile for existing user:', uid);
      
      // Create Firestore profile immediately
      await FirestoreUserService.createUser(uid, {
        displayName: user.display_name,
        email: user.email
      });
      
      console.log('Firestore profile created successfully for existing user');
      
      return {
        uid,
        display_name: user.display_name,
        email: user.email
      };
    } catch (error: any) {
      console.error('findOrCreateUser: Error creating user:', error);
      throw error;
    }
  } else {
    const response = await apiCall('/api/user/find-or-create', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error('Failed to find or create user');
    return response.json();
  }
};

export const saveApiKey = async (apiKey: string): Promise<void> => {
  if (isFirebaseMode()) {
    return;
  } else {
    const response = await apiCall('/api/user/api-key', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
    if (!response.ok) throw new Error('Failed to save API key');
  }
};

export const checkApiKeyStatus = async (): Promise<{ hasApiKey: boolean }> => {
  if (isFirebaseMode()) {
    return { hasApiKey: false };
  } else {
    const response = await apiCall('/api/user/api-key-status', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to check API key status');
    return response.json();
  }
};

export const deleteAccount = async (): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    await FirestoreUserService.deleteUser(uid);
  } else {
    const response = await apiCall('/api/user/profile', { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete account');
  }
};

export const getPresets = async (): Promise<PromptPreset[]> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    const firestorePresets = await FirestorePromptPresetService.getPresets(uid);
    return firestorePresets.map(preset => convertFirestorePreset(preset, uid));
  } else {
    const response = await apiCall('/api/presets');
    if (!response.ok) throw new Error('Failed to fetch presets');
    return response.json();
  }
};

export const createPreset = async (data: { title: string, prompt: string }): Promise<{ id: string }> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    const presetId = await FirestorePromptPresetService.createPreset(uid, {
      title: data.title,
      prompt: data.prompt,
      isDefault: false
    });
    return { id: presetId };
  } else {
    const response = await apiCall('/api/presets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create preset');
    return response.json();
  }
};

export const updatePreset = async (id: string, data: { title: string, prompt: string }): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    await FirestorePromptPresetService.updatePreset(uid, id, {
      title: data.title,
      prompt: data.prompt
    });
  } else {
    const response = await apiCall(`/api/presets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update preset');
  }
};

export const deletePreset = async (id: string): Promise<void> => {
  if (isFirebaseMode()) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user');
    
    await FirestorePromptPresetService.deletePreset(uid, id);
  } else {
    const response = await apiCall(`/api/presets/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete preset');
  }
};

export interface BatchData {
  profile?: UserProfile;
  presets?: PromptPreset[];
  sessions?: Session[];
}

export const getBatchData = async (includes: ('profile' | 'presets' | 'sessions')[]): Promise<BatchData> => {
  if (isFirebaseMode()) {
    const promises: Promise<any>[] = [];
    
    if (includes.includes('profile')) {
      promises.push(getUserProfile().then(profile => ({ type: 'profile', data: profile })));
    }
    if (includes.includes('presets')) {
      promises.push(getPresets().then(presets => ({ type: 'presets', data: presets })));
    }
    if (includes.includes('sessions')) {
      promises.push(getSessions().then(sessions => ({ type: 'sessions', data: sessions })));
    }
    
    const results = await Promise.allSettled(promises);
    const batchData: BatchData = {};
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { type, data } = result.value;
        batchData[type as keyof BatchData] = data;
      }
    });
    
    return batchData;
  } else {
    const response = await apiCall(`/api/batch?includes=${includes.join(',')}`);
    if (!response.ok) throw new Error('Failed to fetch batch data');
    return response.json();
  }
};

export const logout = async () => {
  if (isFirebaseMode()) {
    await auth.signOut();
  } else {
    const response = await apiCall('/api/auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to logout');
  }
};

export const createUserAndProfileSafely = async (email: string, password: string, uid: string, data: any) => {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 500;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let user = auth.currentUser;
      
      if (!user) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }
      
      // Attendre que l'utilisateur soit complètement authentifié
      await user.getIdToken(true);
      
      // Attendre un peu plus pour s'assurer que auth.currentUser est mis à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Vérifier que l'utilisateur est bien authentifié avant d'écrire dans Firestore
      if (!auth.currentUser) {
        console.error('User not authenticated after creation');
        throw new Error('Erreur d\'authentification');
      }
      
      console.log('Creating Firestore profile for user:', user.uid);
      
      await FirestoreUserService.createUser(user.uid, {
        displayName: data.displayName,
        email: data.email
      });
      
      console.log('Firestore profile created successfully');
      return user;
    } catch (error: any) {
      console.error(`Registration attempt ${attempt} failed:`, error);
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Cette adresse email est déjà utilisée');
      }
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`Échec de la création du compte après ${MAX_RETRIES} tentatives. Veuillez réessayer.`);
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
    }
  }
}; 