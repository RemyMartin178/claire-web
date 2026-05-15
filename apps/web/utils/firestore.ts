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
import { FirebaseErrorHandler } from './errorHandler'

export interface FirestoreUserProfile {
  displayName: string;
  email: string;
  createdAt: Timestamp;
  // Admin flag stored on the user document; should only be set by existing admins
  isAdmin?: boolean;
  // Stripe subscription fields
  subscription?: {
    status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
    plan: 'free' | 'plus' | 'enterprise';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart?: Timestamp;
    currentPeriodEnd?: Timestamp;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: Timestamp;
    updatedAt: Timestamp;
  };
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

export class FirestoreUserService {
  private static readonly MAX_RETRIES = 2; // Reduced from 3
  private static readonly RETRY_DELAY = 500; // Reduced from 1000
  private static readonly TOKEN_REFRESH_DELAY = 1000; // Reduced from 2000

  static createUser = async (uid: string, profile: Omit<FirestoreUserProfile, 'createdAt'>): Promise<void> => {
    const userRef = doc(firestore, 'users', uid);

    const defaultSubscription = {
      status: 'active',
      plan: 'free',
      cancelAtPeriodEnd: false,
      updatedAt: serverTimestamp(),
    };

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.ensureValidToken();

        const existingDoc = await getDoc(userRef);
        if (existingDoc.exists()) {
          const existingData = existingDoc.data() as any;
          const needsSubscriptionBackfill = !existingData?.subscription;

          await updateDoc(userRef, {
            displayName: profile.displayName,
            email: profile.email,
            ...(needsSubscriptionBackfill ? { subscription: defaultSubscription } : {}),
          });
          return;
        }

        await setDoc(userRef, {
          ...profile,
          createdAt: serverTimestamp(),
          subscription: defaultSubscription
        });

        return;
      } catch (error: any) {
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
  };

  static getUser = async (uid: string): Promise<FirestoreUserProfile | null> => {
    try {
      await this.ensureValidToken();

      const userRef = doc(firestore, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return null;

      return userSnap.data() as FirestoreUserProfile;
    } catch (error: any) {
      if (error.code === 'permission-denied') return null;
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded') return null;
      return null;
    }
  };

  static updateUser = async (uid: string, updates: Partial<FirestoreUserProfile>): Promise<void> => {
    try {
      await this.ensureValidToken();

      const userRef = doc(firestore, 'users', uid);
      await updateDoc(userRef, updates);
    } catch (error: any) {
      console.error('FirestoreUserService: Error updating user:', error, { uid, updates });
      throw new Error(`Failed to update user: ${FirebaseErrorHandler.getUserFriendlyMessage(error)}`);
    }
  };

  static deleteUser = async (uid: string): Promise<void> => {
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

        const aiMessagesRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'ai_messages');
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
  };

  private static async ensureValidToken(): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('No authenticated user found');
    }

    try {
      await user.getIdToken(true);
      await this.delay(200);
    } catch {
      throw new Error('Authentication token is invalid. Please sign in again.');
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

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
    const querySnapshot = await getDocs(sessionsRef);

    const docs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestoreSession
    }));
    // Sort in memory to support both startedAt and started_at
    return docs.sort((a: any, b: any) => {
      const aTime = a.startedAt?.toMillis?.() || a.started_at?.toMillis?.() || 0;
      const bTime = b.startedAt?.toMillis?.() || b.started_at?.toMillis?.() || 0;
      return bTime - aTime;
    });
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

    const aiMessagesRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'ai_messages');
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
    const querySnapshot = await getDocs(transcriptsRef);

    const docs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestoreTranscript
    }));

    return docs.sort((a: any, b: any) => {
      const aTime = a.startAt?.toMillis?.() || a.start_at?.toMillis?.() || 0;
      const bTime = b.startAt?.toMillis?.() || b.start_at?.toMillis?.() || 0;
      return aTime - bTime;
    });
  }
}

export class FirestoreAiMessageService {
  static async addAiMessage(uid: string, sessionId: string, message: Omit<FirestoreAiMessage, 'createdAt'>): Promise<string> {
    const aiMessagesRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'ai_messages');
    const docRef = await addDoc(aiMessagesRef, {
      ...message,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getAiMessages(uid: string, sessionId: string): Promise<Array<{ id: string } & FirestoreAiMessage>> {
    const aiMessagesRef = collection(firestore, 'users', uid, 'sessions', sessionId, 'ai_messages');
    const querySnapshot = await getDocs(aiMessagesRef);

    const docs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FirestoreAiMessage
    }));

    return docs.sort((a: any, b: any) => {
      const aTime = a.sentAt?.toMillis?.() || a.sent_at?.toMillis?.() || 0;
      const bTime = b.sentAt?.toMillis?.() || b.sent_at?.toMillis?.() || 0;
      return aTime - bTime;
    });
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