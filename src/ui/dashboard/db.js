/**
 * Firestore helpers for the dashboard — mirrors pickleglass_web/utils/firestore.ts
 */
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, doc, getDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore'
import { auth } from './firebase.js'

const firebaseConfig = {
  apiKey: 'AIzaSyDZz5iEcMo6eBpt5cZ4Hz4TaE4aDiWMqho',
  authDomain: 'auth.clairia.app',
  projectId: 'dedale-database',
  storageBucket: 'dedale-database.firebasestorage.app',
  messagingSenderId: '100635676468',
  appId: '1:100635676468:web:46fdecfad3133fef4b5f61',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const db = getFirestore(app)

export async function getSessions(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'sessions'))
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return docs
    .filter(s => s.session_type !== 'ask')
    .sort((a, b) => {
      const aT = a.startedAt?.toMillis?.() || a.started_at?.toMillis?.() || 0
      const bT = b.startedAt?.toMillis?.() || b.started_at?.toMillis?.() || 0
      return bT - aT
    })
}

export async function getSessionWithSummary(uid, sessionId) {
  const [sessionSnap, summarySnap, transcriptsSnap, aiSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'sessions', sessionId)),
    getDoc(doc(db, 'users', uid, 'sessions', sessionId, 'summary', 'data')),
    getDocs(collection(db, 'users', uid, 'sessions', sessionId, 'transcripts')),
    getDocs(collection(db, 'users', uid, 'sessions', sessionId, 'ai_messages')),
  ])

  if (!sessionSnap.exists()) return null

  const session = { id: sessionId, ...sessionSnap.data() }
  const summary = summarySnap.exists() ? summarySnap.data() : null
  const transcripts = transcriptsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.startAt?.toMillis?.() || 0) - (b.startAt?.toMillis?.() || 0))
  const aiMessages = aiSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.sentAt?.toMillis?.() || 0) - (b.sentAt?.toMillis?.() || 0))

  return { session, summary, transcripts, aiMessages }
}

export async function deleteSession(uid, sessionId) {
  const batch = writeBatch(db)
  const [trSnap, aiSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'sessions', sessionId, 'transcripts')),
    getDocs(collection(db, 'users', uid, 'sessions', sessionId, 'ai_messages')),
  ])
  trSnap.docs.forEach(d => batch.delete(d.ref))
  aiSnap.docs.forEach(d => batch.delete(d.ref))
  batch.delete(doc(db, 'users', uid, 'sessions', sessionId, 'summary', 'data'))
  batch.delete(doc(db, 'users', uid, 'sessions', sessionId))
  await batch.commit()
}
