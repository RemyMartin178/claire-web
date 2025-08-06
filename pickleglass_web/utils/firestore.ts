import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  writeBatch, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore'
import { db as firestore, auth } from './firebase'
import { trackUserOperation } from './monitoring'
import { FirebaseErrorHandler } from './errorHandler'

export interface FirestoreUserProfile {
  displayName: string;
  email: string;
  createdAt: Timestamp;
}

export interface FirestoreSession {
  title: string;
  session_type: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
}

export interface FirestoreTranscript {
  startAt: Timestamp;
  endAt: Timestamp;
  speaker: 'me' | 'other';
  text: string;
  lang?: string;
  createdAt: Timestamp;
}

export interface FirestoreAiMessage {
  sentAt: Timestamp;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  model?: string;
  createdAt: Timestamp;
}

export interface FirestoreSummary {
  generatedAt: Timestamp;
  model: string;
  text: string;
  tldr: string;
  bulletPoints: string[];
  actionItems: Array<{ owner: string; task: string; due: string }>;
  tokensUsed?: number;
}

export interface FirestorePromptPreset {
  title: string;
  prompt: string;
  isDefault: boolean;
  createdAt: Timestamp;
}

class FirestoreUserService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly TOKEN_REFRESH_DELAY = 2000;

  static createUser = trackUserOperation('firestore_create_user', async (uid: string, profile: Omit<FirestoreUserProfile, 'createdAt'>): Promise<void> => {
    console.log('FirestoreUserService: Creating user with uid:', uid, 'profile:', profile);
    const userRef = doc(firestore, 'users', uid);
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.ensureValidToken();
        
        const existingDoc = await getDoc(userRef);
        if (existingDoc.exists()) {
          console.log('FirestoreUserService: User document already exists, updating profile');
          await updateDoc(userRef, {
            displayName: profile.displayName,
            email: profile.email
          });
          return;
        }

        await setDoc(userRef, {
          ...profile,
          createdAt: serverTimestamp()
        });
        
        console.log('FirestoreUserService: User created successfully on attempt', attempt);
        return;
      } catch (error: any) {
        console.error(`FirestoreUserService: Attempt ${attempt} failed:`, error);
        
        if (attempt === this.MAX_RETRIES) {
          throw new Error(`Failed to create user after ${this.MAX_RETRIES} attempts: ${FirebaseErrorHandler.getUserFriendlyMessage(error)}`);
        }
        
        if (error.code === 'permission-denied') {
          throw new Error('Permission denied. Please check your authentication status.');
        }
        
        if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
          await this.delay(this.RETRY_DELAY * attempt);
          continue;
        }
        
        throw error;
      }
    }
  });

  static getUser = trackUserOperation('firestore_get_user', async (uid: string): Promise<FirestoreUserProfile | null> => {
    try {
      await this.ensureValidToken();
      
      const userRef = doc(firestore, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.warn("FirestoreUserService: User document does not exist for uid:", uid);
        return null;
      }
      
      return userSnap.data() as FirestoreUserProfile;
    } catch (error: any) {
      console.error('FirestoreUserService: Error getting user:', error, { uid });
      
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please check your authentication status.');
      }
      
      return null;
    }
  });

  static updateUser = trackUserOperation('firestore_update_user', async (uid: string, updates: Partial<FirestoreUserProfile>): Promise<void> => {
    try {
      await this.ensureValidToken();
      
      const userRef = doc(firestore, 'users', uid);
      await updateDoc(userRef, updates);
    } catch (error: any) {
      console.error('FirestoreUserService: Error updating user:', error, { uid, updates });
      throw new Error(`Failed to update user: ${FirebaseErrorHandler.getUserFriendlyMessage(error)}`);
    }
  });

  static deleteUser = trackUserOperation('firestore_delete_user', async (uid: string): Promise<void> => {
    try {
      await this.ensureValidToken();
      
      const batch = writeBatch(firestore);
      
      const sessionsRef = collection(firestore, 'users', uid, 'sessions');
      const sessionsSnap = await getDocs(sessionsRef);
      
      for (const sessionDoc of sessionsSnap.docs) {
        const sessionId = sessionDoc.id;
        
        const transcriptsRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'transcripts');
        const transcriptsSnap = await getDocs(transcriptsRef);
        transcriptsSnap.docs.forEach(doc => batch.delete(doc.ref));
        
        const aiMessagesRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'aiMessages');
        const aiMessagesSnap = await getDocs(aiMessagesRef);
        aiMessagesSnap.docs.forEach(doc => batch.delete(doc.ref));
        
        const summaryRef = doc(firestore, 'users', uid, 'sessions', sessionId, 'summary', 'data');
        batch.delete(summaryRef);
        
        batch.delete(sessionDoc.ref);
      }
      
      const presetsRef = collection(firestore, 'users', uid, 'promptPresets');
      const presetsSnap = await getDocs(presetsRef);
      presetsSnap.docs.forEach(doc => batch.delete(doc.ref));
      
      const userRef = doc(firestore, 'users', uid);
      batch.delete(userRef);
      
      await batch.commit();
    } catch (error: any) {
      console.error('FirestoreUserService: Error deleting user:', error, { uid });
      throw new Error(`Failed to delete user: ${FirebaseErrorHandler.getUserFriendlyMessage(error)}`);
    }
  });

  private static async ensureValidToken(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    try {
      await user.getIdToken(true);
      await this.delay(500);
    } catch (error: any) {
      console.error('FirestoreUserService: Token refresh failed:', error);
      throw new Error('Authentication token is invalid. Please sign in again.');
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { FirestoreUserService };

export class FirestoreSessionService {
  static async createSession(uid: string, session: Omit<FirestoreSession, 'startedAt'>): Promise<string> {
    const sessionsRef = collection(firestore, 'users', uid, 'sessions');
    const docRef = await addDoc(sessionsRef, {
      ...session,
      startedAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getSession(uid: string, sessionId: string): Promise<FirestoreSession | null> {
    const sessionRef = doc(firestore, 'users', uid, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    return sessionSnap.exists() ? sessionSnap.data() as FirestoreSession : null;
  }

  static async getSessions(uid: string): Promise<Array<{ id: string } & FirestoreSession>> {
    const sessionsRef = collection(firestore, 'users', uid, 'sessions');
    const q = query(sessionsRef, orderBy('startedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestoreSession
    }));
  }

  static async updateSession(uid: string, sessionId: string, updates: Partial<FirestoreSession>) {
    const sessionRef = doc(firestore, 'users', uid, 'sessions', sessionId);
    await updateDoc(sessionRef, updates);
  }

  static async deleteSession(uid: string, sessionId: string) {
    const batch = writeBatch(firestore);
    
    const transcriptsRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'transcripts');
    const transcriptsSnap = await getDocs(transcriptsRef);
    transcriptsSnap.docs.forEach(doc => batch.delete(doc.ref));
    
    const aiMessagesRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'aiMessages');
    const aiMessagesSnap = await getDocs(aiMessagesRef);
    aiMessagesSnap.docs.forEach(doc => batch.delete(doc.ref));
    
    const summaryRef = doc(firestore, 'users', uid, 'sessions', sessionId, 'summary', 'data');
    batch.delete(summaryRef);
    
    const sessionRef = doc(firestore, 'users', uid, 'sessions', sessionId);
    batch.delete(sessionRef);
    
    await batch.commit();
  }
}

export class FirestoreTranscriptService {
  static async addTranscript(uid: string, sessionId: string, transcript: Omit<FirestoreTranscript, 'createdAt'>): Promise<string> {
    const transcriptsRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'transcripts');
    const docRef = await addDoc(transcriptsRef, {
      ...transcript,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getTranscripts(uid: string, sessionId: string): Promise<Array<{ id: string } & FirestoreTranscript>> {
    const transcriptsRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'transcripts');
    const q = query(transcriptsRef, orderBy('startAt', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestoreTranscript
    }));
  }
}

export class FirestoreAiMessageService {
  static async addAiMessage(uid: string, sessionId: string, message: Omit<FirestoreAiMessage, 'createdAt'>): Promise<string> {
    const aiMessagesRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'aiMessages');
    const docRef = await addDoc(aiMessagesRef, {
      ...message,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getAiMessages(uid: string, sessionId: string): Promise<Array<{ id: string } & FirestoreAiMessage>> {
    const aiMessagesRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'aiMessages');
    const q = query(aiMessagesRef, orderBy('sentAt', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestoreAiMessage
    }));
  }
}

export class FirestoreSummaryService {
  static async setSummary(uid: string, sessionId: string, summary: FirestoreSummary) {
    const summaryRef = doc(firestore, 'users', uid, 'sessions', sessionId, 'summary', 'data');
    await setDoc(summaryRef, summary);
  }

  static async getSummary(uid: string, sessionId: string): Promise<FirestoreSummary | null> {
    const summaryRef = doc(firestore, 'users', uid, 'sessions', sessionId, 'summary', 'data');
    const summarySnap = await getDoc(summaryRef);
    return summarySnap.exists() ? summarySnap.data() as FirestoreSummary : null;
  }
}

export class FirestorePromptPresetService {
  static async createPreset(uid: string, preset: Omit<FirestorePromptPreset, 'createdAt'>): Promise<string> {
    const presetsRef = collection(firestore, 'users', uid, 'promptPresets');
    const docRef = await addDoc(presetsRef, {
      ...preset,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getPresets(uid: string): Promise<Array<{ id: string } & FirestorePromptPreset>> {
    const presetsRef = collection(firestore, 'users', uid, 'promptPresets');
    const q = query(presetsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestorePromptPreset
    }));
  }

  static async updatePreset(uid: string, presetId: string, updates: Partial<FirestorePromptPreset>) {
    const presetRef = doc(firestore, 'users', uid, 'promptPresets', presetId);
    await updateDoc(presetRef, updates);
  }

  static async deletePreset(uid: string, presetId: string) {
    const presetRef = doc(firestore, 'users', uid, 'promptPresets', presetId);
    await deleteDoc(presetRef);
  }
} 