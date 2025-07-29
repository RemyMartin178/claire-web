"use client"

import { useEffect, useState } from 'react';
import { getUserProfile, getSessions, getPresets, UserProfile, Session, PromptPreset } from '@/utils/api';
import Link from 'next/link';
import { MessageCircle, PlusCircle, CheckCircle, Clock, Book, ChevronDown } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AccueilPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [profile, sessions, presets] = await Promise.all([
          getUserProfile(),
          getSessions(),
          getPresets()
        ]);
        setUser(profile);
        setSessions(sessions);
        setPresets(presets);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const successRate = sessions.length
    ? Math.round((sessions.filter(s => s.ended_at).length / sessions.length) * 100)
    : 0;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center text-white">Chargement…</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen w-full flex flex-col gap-8 px-4 py-8 md:px-12 md:py-12 bg-transparent">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-white">Dashboard Claire</h1>
            <p className="text-[#bbb]">Bonjour, {user?.displayName || 'Utilisateur'} !</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/activite" className="flex items-center gap-2 bg-accent-light hover:opacity-90 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow transition-all">
              <PlusCircle className="w-5 h-5" />
              Nouvelle conversation
            </Link>
            <button className="flex items-center gap-2 bg-[#232329] border border-[#3a3a4a] text-white px-4 py-2 rounded-lg font-medium shadow">
              Derniers 30 jours
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cartes récap */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#232329] p-6 flex flex-col gap-2 border border-[#3a3a4a] shadow min-h-[120px]">
            <div className="flex items-center gap-2 mb-2"><MessageCircle className="w-6 h-6 text-accent-light" /></div>
            <div className="text-2xl font-bold text-white">{sessions.length}</div>
            <div className="text-[#bbb]">Conversations</div>
          </div>
          <div className="rounded-xl bg-[#232329] p-6 flex flex-col gap-2 border border-[#3a3a4a] shadow min-h-[120px]">
            <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-6 h-6 text-accent-light" /></div>
            <div className="text-2xl font-bold text-white">{successRate}%</div>
            <div className="text-[#bbb]">Taux de succès</div>
          </div>
          <div className="rounded-xl bg-[#232329] p-6 flex flex-col gap-2 border border-[#3a3a4a] shadow min-h-[120px]">
            <div className="flex items-center gap-2 mb-2"><Clock className="w-6 h-6 text-accent-light" /></div>
            <div className="text-2xl font-bold text-white">-</div>
            <div className="text-[#bbb]">Temps moyen</div>
          </div>
          <div className="rounded-xl bg-[#232329] p-6 flex flex-col gap-2 border border-[#3a3a4a] shadow min-h-[120px]">
            <div className="flex items-center gap-2 mb-2"><Book className="w-6 h-6 text-accent-light" /></div>
            <div className="text-2xl font-bold text-white">{presets.length}</div>
            <div className="text-[#bbb]">Prompts personnalisés</div>
          </div>
        </div>

        {/* Liste des dernières conversations */}
        <div className="bg-[#232329] rounded-xl p-6 border border-[#3a3a4a] shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Dernières conversations</h2>
            <Link href="/activite" className="text-accent-light text-sm hover:underline">Voir tout</Link>
          </div>
          <ul className="divide-y divide-[#3a3a4a]">
            {sessions.slice(0, 5).map(conv => (
              <li key={conv.id} className="py-3 flex items-center justify-between">
                <span className="truncate text-white">{conv.title}</span>
                <span className="text-xs text-[#bbb]">{new Date(conv.started_at * 1000).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  );
} 