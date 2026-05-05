'use client';

import React, { useCallback, useEffect, useRef, useState, MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Settings, Calendar, Keyboard, User, Shield, Languages,
  CreditCard, FileText, Globe, HelpCircle, LogOut, Power,
  Check, ChevronRight, Monitor, Smartphone, ChevronDown,
  RefreshCw, Mic, Plus, MoreHorizontal, Trash2, Eye, EyeOff,
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { logout, getUserSettings, updateUserSettings, getAuthType, updateUserProfile, deleteAccount, getApiHeaders } from '@/utils/api';
import { openOAuthPopup, checkAuthStatus, revokeAuth } from '@/utils/oauth';
import { trackLogout } from '@/lib/gtag';
import { getElectronLoginPath, useElectronRuntime } from '@/utils/electron';
import { usePasswordModal } from '@/contexts/PasswordModalContext';
import toast from 'react-hot-toast';
import { auth } from '@/utils/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, linkWithCredential, updateProfile } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchClick: () => void;
}

type TabType =
  | "general" | "calendrier" | "raccourcis" | "profil"
  | "securite" | "langage" | "facturation"
  | "notes" | "aide" | "contact";

interface Device {
  id: string; name: string; os: string; browser: string;
  location: string; ip: string; lastSeen: string; isCurrent: boolean;
}

const DEFAULT_SHORTCUTS = [
  { id: 'toggle_claire', group: 'Général', label: 'Afficher/masquer Claire', keys: ['Ctrl', '\\'] },
  { id: 'ask_claire',   group: 'Général', label: 'Demander à Claire',       keys: ['Ctrl', '↵'] },
  { id: 'clear_chat',  group: 'Général', label: 'Effacer la conversation',  keys: ['Ctrl', 'R'] },
  { id: 'session',     group: 'Général', label: 'Démarrer/arrêter session', keys: ['Ctrl', 'Shift', '\\'] },
  { id: 'move_up',    group: 'Fenêtre',  label: 'Déplacer la fenêtre haut', keys: ['Ctrl', '↑'] },
  { id: 'move_down',  group: 'Fenêtre',  label: 'Déplacer la fenêtre bas',  keys: ['Ctrl', '↓'] },
  { id: 'move_left',  group: 'Fenêtre',  label: 'Déplacer la fenêtre gauche', keys: ['Ctrl', '←'] },
  { id: 'move_right', group: 'Fenêtre',  label: 'Déplacer la fenêtre droite', keys: ['Ctrl', '→'] },
  { id: 'scroll_up',  group: 'Défilement', label: 'Défiler réponse haut',   keys: ['Ctrl', 'Shift', '↑'] },
  { id: 'scroll_down', group: 'Défilement', label: 'Défiler réponse bas',   keys: ['Ctrl', 'Shift', '↓'] },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors outline-none ${on ? 'bg-blue-500' : 'bg-neutral-300'}`}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
      role="switch" aria-checked={on}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${on ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

function CustomSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  return (
    <div className="relative w-[220px]" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className="w-full flex items-center justify-between bg-white border border-neutral-200 text-neutral-900 text-[13px] font-medium py-2 pl-4 pr-3 rounded-[6px] outline-none shadow-sm hover:bg-neutral-50 transition-colors"
      >
        <span>{value}</span>
        <ChevronDown size={14} className={`text-neutral-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 w-[220px] mt-1.5 bg-white border border-neutral-200 rounded-[6px] shadow-lg overflow-hidden z-[200]"
          >
            {options.map(opt => (
              <button
                key={opt} type="button"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onChange(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${value === opt ? 'bg-neutral-50 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'}`}
              >{opt}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MIC LEVEL BAR ─────────────────────────────────────────────────────────────
function MicLevelBar({ level }: { level: number }) {
  const bars = 12;
  return (
    <div className="flex gap-0.5 items-end h-5">
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i / bars) * 100;
        const active = level > threshold;
        const color = i < 8 ? 'bg-emerald-400' : i < 10 ? 'bg-yellow-400' : 'bg-red-400';
        return <div key={i} className={`w-1.5 rounded-sm transition-all ${active ? color : 'bg-neutral-200'}`} style={{ height: `${40 + i * 5}%` }} />;
      })}
    </div>
  );
}

export default function SettingsModalElectron({ isOpen, onClose, onSearchClick }: SettingsModalProps) {
  const { user: userInfo } = useAuth();
  const isElectronRuntime = useElectronRuntime();
  const { openModal: openPasswordModal } = usePasswordModal();

  const [activeTab, setActiveTab] = useState<TabType>("general");

  // General
  const [version, setVersion] = useState<string | null>(null);
  const [isCheckingVersion, setIsCheckingVersion] = useState(false);
  const [detectable, setDetectable] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [colorTheme, setColorTheme] = useState<'Système' | 'Clair' | 'Sombre'>('Système');
  const [screenUse, setScreenUse] = useState(false);
  const [hideWidget, setHideWidget] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  // Mic
  const [micDeviceName, setMicDeviceName] = useState('Microphone par défaut');
  const [isMicTesting, setIsMicTesting] = useState(false);
  const micLevelRef = useRef<HTMLDivElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnimRef = useRef<number>(0);

  // Billing
  const [billingAnnual, setBillingAnnual] = useState(true);

  // Language
  const [transcriptionLang, setTranscriptionLang] = useState('Français (recommandé)');
  const [outputLang, setOutputLang] = useState('Français');

  // Shortcuts
  const [shortcutsList, setShortcutsList] = useState(DEFAULT_SHORTCUTS);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);

  // Profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [providers, setProviders] = useState<Array<{ providerId: string; email: string }>>([]);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [showEmailOptions, setShowEmailOptions] = useState(false);

  // Security
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Calendar
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState('');
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // Settings load state
  const settingsLoadedRef = useRef(false);

  // ── LOAD SETTINGS ON OPEN ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || settingsLoadedRef.current) return;
    settingsLoadedRef.current = true;

    // Load user settings from Firestore
    getUserSettings().then(s => {
      if (s.detectable !== undefined) setDetectable(s.detectable);
      if (s.ambient !== undefined) setAmbient(s.ambient);
      if (s.colorTheme) setColorTheme(s.colorTheme);
      if (s.screenUse !== undefined) setScreenUse(s.screenUse);
      if (s.hideWidget !== undefined) setHideWidget(s.hideWidget);
      if (s.transcriptionLang) setTranscriptionLang(s.transcriptionLang);
      if (s.outputLang) setOutputLang(s.outputLang);
      if (s.shortcuts?.length) setShortcutsList(s.shortcuts);
    }).catch(() => {});

    // Load version with 3s timeout
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    fetch('/api/version', { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setVersion(d.version || d.tag || d.current_version || null))
      .catch(() => setVersion(null))
      .finally(() => clearTimeout(timer));

    // Load connected providers + detect if user has a password
    getAuthType().then(info => {
      const currentUser = auth.currentUser;
      if (currentUser?.providerData) {
        setProviders(currentUser.providerData.map((p: { providerId: string; email: string | null }) => ({
          providerId: p.providerId,
          email: p.email || info.email,
        })));
        const hasEmailPassword = currentUser.providerData.some(
          (p: any) => p.providerId === 'password'
        );
        setHasPassword(hasEmailPassword);
      }
    }).catch(() => {});
  }, [isOpen]);

  // Load devices when Sécurité tab opens
  useEffect(() => {
    if (activeTab !== 'securite' || !userInfo) return;
    if (devices.length > 0) return;

    setIsLoadingDevices(true);

    const fetchDevices = async () => {
      try {
        let baseUrl = 'http://localhost:3001';
        try {
          const cfg = await fetch('/runtime-config.json');
          if (cfg.ok) { const c = await cfg.json(); baseUrl = c.API_URL || baseUrl; }
        } catch {}

        const headers = await getApiHeaders();
        const resp = await fetch(`${baseUrl}/api/v1/sessions/user/${userInfo.uid}`, { headers });
        if (resp.ok) {
          const data = await resp.json();
          if (data.length > 0) {
            const ua = navigator.userAgent;
            const mapped: Device[] = data.map((s: any, i: number) => ({
              id: s.id,
              name: s.os_info?.toLowerCase().includes('windows') ? 'Windows' : s.os_info?.toLowerCase().includes('mac') ? 'macOS' : 'Appareil',
              os: s.os_info || 'Inconnu',
              browser: s.browser_info || 'Inconnu',
              location: 'Localisation masquée',
              ip: s.ip_address || 'Non spécifiée',
              lastSeen: s.last_seen_at ? new Date(s.last_seen_at).toLocaleString('fr-FR') : 'Inconnu',
              isCurrent: i === 0,
            }));
            setDevices(mapped);
            return;
          }
        }
      } catch {}

      // Fallback: current device only
      try {
        const ipResp = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResp.json();
        const ua = navigator.userAgent;
        let browser = 'Inconnu', os = 'Inconnu';
        if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edg')) browser = 'Edge';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        setDevices([{ id: 'current', name: os, os, browser, location: '', ip, lastSeen: 'Connecté maintenant', isCurrent: true }]);
      } catch {
        setDevices([{ id: 'current', name: 'Cet appareil', os: 'Inconnu', browser: 'Inconnu', location: '', ip: '', lastSeen: 'Maintenant', isCurrent: true }]);
      }
    };

    fetchDevices().finally(() => setIsLoadingDevices(false));
  }, [activeTab, userInfo]);

  // Load calendar status when tab opens
  useEffect(() => {
    if (activeTab !== 'calendrier' || !userInfo?.uid) return;
    setIsLoadingCalendar(true);
    checkAuthStatus('google_calendar', userInfo.uid)
      .then(status => {
        setCalendarConnected(status.authenticated);
        const email = (status as any).accountEmail || '';
        setCalendarEmail(email);
      })
      .catch(() => { setCalendarConnected(false); setCalendarEmail(''); })
      .finally(() => setIsLoadingCalendar(false));
  }, [activeTab, userInfo]);

  // ── PROFILE INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userInfo) return;
    const name = userInfo.display_name || userInfo.email?.split('@')[0] || '';
    const parts = name.split(' ');
    setProfileFirstName(parts[0] || '');
    setProfileLastName(parts.slice(1).join(' ') || '');
  }, [userInfo]);

  // ── THEME APPLY ───────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (colorTheme === 'Sombre') {
      root.classList.add('dark');
    } else if (colorTheme === 'Clair') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
    }
  }, [colorTheme]);

  // ── ESC + SCROLL LOCK ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (editingShortcutId) return; if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [isOpen, onClose, editingShortcutId]);

  // ── SHORTCUT CAPTURE ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!editingShortcutId) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      if (e.metaKey) keys.push('Win');
      let key = e.key;
      if (key === 'Enter') key = '↵';
      else if (key === 'ArrowUp') key = '↑';
      else if (key === 'ArrowDown') key = '↓';
      else if (key === 'ArrowLeft') key = '←';
      else if (key === 'ArrowRight') key = '→';
      else if (key === 'Escape') { setEditingShortcutId(null); return; }
      else if (key === ' ') key = 'Espace';
      else key = key.toUpperCase();
      keys.push(key);
      const updated = shortcutsList.map(s => s.id === editingShortcutId ? { ...s, keys } : s);
      setShortcutsList(updated);
      setEditingShortcutId(null);
      updateUserSettings({ shortcuts: updated }).catch(() => {});
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [editingShortcutId, shortcutsList]);

  // ── HANDLERS ─────────────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    try { trackLogout(); await logout(); window.location.href = isElectronRuntime === true ? getElectronLoginPath() : '/auth/login'; }
    catch (e) { console.error(e); }
  }, [isElectronRuntime]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose(); };

  const getUserDisplayName = () => {
    if (!userInfo) return 'Utilisateur';
    if (userInfo.display_name) return userInfo.display_name;
    if (userInfo.email) return userInfo.email.split('@')[0];
    return 'Utilisateur';
  };

  const openInBrowser = (url: string) => {
    if (typeof window !== 'undefined' && (window as any).api?.common?.openExternal) {
      (window as any).api.common.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const persistToggle = (key: string, value: boolean) => updateUserSettings({ [key]: value } as any).catch(() => {});
  const persistSelect = (key: string, value: string) => updateUserSettings({ [key]: value } as any).catch(() => {});

  const handleCheckVersion = async () => {
    setIsCheckingVersion(true);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch('/api/version', { signal: ctrl.signal });
      clearTimeout(timer);
      const d = await r.json();
      const v = d.version || d.tag || d.current_version || null;
      setVersion(v);
      toast.success(v ? `Version ${v} — vous êtes à jour !` : 'Version à jour.');
    } catch { toast.error('Impossible de vérifier la version.'); }
    finally { setIsCheckingVersion(false); }
  };

  const handleMicTest = async () => {
    if (isMicTesting) {
      // Stop
      micStreamRef.current?.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
      cancelAnimationFrame(micAnimRef.current);
      if (micLevelRef.current) {
        Array.from(micLevelRef.current.children).forEach((bar) => {
          (bar as HTMLElement).style.backgroundColor = '#e5e7eb';
        });
      }
      setIsMicTesting(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      // Get device name
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mic = devices.find(d => d.kind === 'audioinput');
      if (mic) setMicDeviceName(mic.label || 'Microphone par défaut');

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      setIsMicTesting(true);

      const BARS = 12;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const level = Math.min(100, (avg / 128) * 100 * 2);
        if (micLevelRef.current) {
          const bars = micLevelRef.current.children;
          for (let i = 0; i < bars.length; i++) {
            const bar = bars[i] as HTMLElement;
            const threshold = (i / BARS) * 100;
            const active = level > threshold;
            bar.style.backgroundColor = active
              ? (i < 8 ? '#34d399' : i < 10 ? '#fbbf24' : '#f87171')
              : '#e5e7eb';
          }
        }
        micAnimRef.current = requestAnimationFrame(tick);
      };
      micAnimRef.current = requestAnimationFrame(tick);
    } catch { toast.error('Impossible d\'accéder au microphone.'); }
  };

  const handleSaveProfile = async () => {
    const displayName = [profileFirstName, profileLastName].filter(Boolean).join(' ').trim();
    if (!displayName) return;
    setIsSavingProfile(true);
    try {
      const user = auth.currentUser;
      if (user) await updateProfile(user, { displayName });
      await updateUserProfile({ displayName });
      setIsEditingProfile(false);
      toast.success('Profil mis à jour.');
    } catch { toast.error('Erreur lors de la mise à jour du profil.'); }
    finally { setIsSavingProfile(false); }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) { toast.error('Le mot de passe doit faire au moins 6 caractères.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas.'); return; }
    const user = auth.currentUser;
    if (!user || !user.email) return;
    setIsSavingPassword(true);
    try {
      if (hasPassword) {
        await updatePassword(user, newPassword);
      } else {
        const credential = EmailAuthProvider.credential(user.email, newPassword);
        await linkWithCredential(user, credential);
      }
      setHasPassword(true);
      if (signOutOthers) {
        try {
          const headers = await getApiHeaders();
          let baseUrl = 'http://localhost:3001';
          try { const cfg = await fetch('/runtime-config.json'); if (cfg.ok) { const c = await cfg.json(); baseUrl = c.API_URL || baseUrl; } } catch {}
          await fetch(`${baseUrl}/api/auth/revoke-sessions`, { method: 'POST', headers, body: JSON.stringify({}) });
          await user.getIdToken(true);
        } catch {}
      }
      toast.success('Mot de passe mis à jour avec succès.');
      setIsEditingPassword(false);
      setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        toast.error('Veuillez vous reconnecter avant de changer le mot de passe.');
      } else if (e.code === 'auth/provider-already-linked') {
        toast.error('Ce compte a déjà un mot de passe, utilisez "Mettre à jour" à la place.');
      } else { toast.error('Erreur lors du changement de mot de passe.'); }
    } finally { setIsSavingPassword(false); }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      const headers = await getApiHeaders();
      let baseUrl = 'http://localhost:3001';
      try { const cfg = await fetch('/runtime-config.json'); if (cfg.ok) { const c = await cfg.json(); baseUrl = c.API_URL || baseUrl; } } catch {}
      await fetch(`${baseUrl}/api/auth/revoke-sessions`, { method: 'POST', headers, body: JSON.stringify({ sessionId: deviceId }) });
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      toast.success('Appareil déconnecté.');
    } catch { toast.error('Erreur lors de la déconnexion.'); }
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== 'SUPPRIMER') return;
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      window.location.href = '/auth/login';
    } catch { toast.error('Erreur lors de la suppression du compte.'); setIsDeletingAccount(false); }
  };

  // ── NAV ITEM ─────────────────────────────────────────────────────────────
  const NavItem = ({ icon: Icon, label, tabId }: { icon: React.ElementType; label: string; tabId: TabType }) => {
    const isActive = activeTab === tabId;
    return (
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setActiveTab(tabId); }}
        className={`flex items-center gap-3 px-3 py-2 rounded-[6px] w-full text-left font-medium transition-all duration-200
          ${isActive ? 'bg-neutral-200/70 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'}`}
        style={{ fontSize: '13.5px' }}
      >
        <Icon size={16} className="shrink-0" strokeWidth={isActive ? 2.5 : 2} />
        <span>{label}</span>
      </button>
    );
  };

  // ── CONTENT PANELS ────────────────────────────────────────────────────────

  const GeneralContent = () => (
    <div>
      <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-2">Général</h2>
      <p className="text-[14px] text-neutral-500 mb-8">Personnalisez le fonctionnement de Claire</p>

      <div className="space-y-4 mb-8">
        {/* Version */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-[6px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
              <RefreshCw size={18} className="text-neutral-500" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-neutral-900">Version de Claire</p>
              <p className="text-[13px] text-neutral-500 mt-0.5">
                {version ? `Version actuelle : ${version}` : 'Chargement de la version...'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCheckVersion}
            disabled={isCheckingVersion}
            className="px-3 py-1.5 bg-white border border-neutral-200 text-neutral-900 shadow-sm hover:bg-neutral-50 transition-colors rounded-[6px] text-[13px] font-bold disabled:opacity-60"
          >
            {isCheckingVersion ? 'Vérification...' : 'Vérifier les MAJ'}
          </button>
        </div>

        {/* Détectable */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-[6px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-neutral-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <div>
              <p className="text-[14px] font-bold text-neutral-900">Détectable</p>
              <p className="text-[13px] text-neutral-500 mt-0.5">
                {detectable ? "Claire est actuellement détectable par le partage d'écran" : "Claire n'est pas détectable par le partage d'écran"}
              </p>
            </div>
          </div>
          <Toggle on={detectable} onToggle={() => { setDetectable(v => { persistToggle('detectable', !v); return !v; }); }} />
        </div>

        {/* Chat IA ambiant */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-[6px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-neutral-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
            </div>
            <div>
              <p className="text-[14px] font-bold text-neutral-900">Chat IA Ambiant</p>
              <p className="text-[13px] text-neutral-500 mt-0.5">Discutez avec Claire en dehors des réunions</p>
            </div>
          </div>
          <Toggle on={ambient} onToggle={() => { setAmbient(v => { persistToggle('ambient', !v); return !v; }); }} />
        </div>

        {/* Thème */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-[6px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-neutral-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
            </div>
            <div>
              <p className="text-[14px] font-bold text-neutral-900">Thème de couleur</p>
              <p className="text-[13px] text-neutral-500 mt-0.5">Utiliser le mode clair, sombre, ou celui du système</p>
            </div>
          </div>
          <CustomSelect
            options={['Système', 'Clair', 'Sombre']}
            value={colorTheme}
            onChange={v => { setColorTheme(v as any); persistSelect('colorTheme', v); }}
          />
        </div>
      </div>

      {/* Audio */}
      <div className="mb-8">
        <p className="text-[14px] font-bold text-neutral-900 mb-1">Paramètres audio</p>
        <p className="text-[13px] text-neutral-500 mb-3">Testez votre entrée audio avant de rejoindre un appel</p>
        <div className="bg-neutral-50 border border-neutral-200 rounded-[6px] p-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-neutral-900 mb-1">Source du microphone</p>
            <div className="flex items-center gap-2">
              <Mic size={13} className="text-neutral-400 shrink-0" />
              <p className="text-[12px] text-neutral-500 truncate">{micDeviceName}</p>
            </div>
            {isMicTesting && (
              <div className="mt-2">
                <div ref={micLevelRef} className="flex gap-0.5 items-end h-5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="w-1.5 rounded-sm bg-neutral-200" style={{ height: `${40 + i * 5}%`, transition: 'background-color 0.05s' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleMicTest}
            className={`shrink-0 px-3 py-1.5 border text-neutral-900 shadow-sm transition-colors rounded-[6px] text-[13px] font-bold ${isMicTesting ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-white border-neutral-200 hover:bg-neutral-50'}`}
          >
            {isMicTesting ? 'Arrêter' : 'Tester le microphone'}
          </button>
        </div>
      </div>

      {/* Avancé */}
      <div>
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); setIsAdvancedOpen(o => !o); }}
          className="w-full flex items-center justify-between mb-4 group text-left outline-none"
        >
          <div>
            <p className="text-[14px] font-bold text-neutral-900 group-hover:text-neutral-700 transition-colors">Avancé</p>
            <p className="text-[13px] text-neutral-500">Configurer les fonctionnalités supplémentaires de Claire</p>
          </div>
          <ChevronDown size={16} className={`text-neutral-400 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {isAdvancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"
            >
              <div className="space-y-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-[6px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                      <Monitor size={20} className="text-neutral-500" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-neutral-900">Utiliser l'écran</p>
                      <p className="text-[13px] text-neutral-500 mt-0.5">Utilise le contexte de l'écran pour l'IA (peut ralentir les réponses)</p>
                    </div>
                  </div>
                  <Toggle on={screenUse} onToggle={() => { setScreenUse(v => { persistToggle('screenUse', !v); return !v; }); }} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-[6px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-neutral-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-neutral-900">Masquer le widget en cachant Claire</p>
                      <p className="text-[13px] text-neutral-500 mt-0.5">Masque tout au lieu de seulement la fenêtre de chat</p>
                    </div>
                  </div>
                  <Toggle on={hideWidget} onToggle={() => { setHideWidget(v => { persistToggle('hideWidget', !v); return !v; }); }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const CalendarContent = () => (
    <div>
      <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-2">Calendrier</h2>
      <p className="text-[14px] text-neutral-500 mb-8">Gérez le compte calendrier que Claire utilise pour les réunions et rappels.</p>
      {isLoadingCalendar ? (
        <p className="text-[13px] text-neutral-500">Chargement...</p>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-[6px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
              <Calendar size={20} className="text-neutral-500" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-neutral-900">Google Calendrier</p>
              <p className="text-[13px] text-neutral-500 mt-0.5">
                {calendarConnected ? calendarEmail : 'Connectez un compte Google personnel ou professionnel.'}
              </p>
            </div>
          </div>
          {calendarConnected ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Connecté
              </span>
              <button
                onClick={async () => {
                  if (!userInfo?.uid) return;
                  try {
                    await revokeAuth('google_calendar', userInfo.uid);
                    setCalendarConnected(false); setCalendarEmail('');
                    toast.success('Google Agenda déconnecté.');
                  } catch { toast.error('Erreur lors de la déconnexion.'); }
                }}
                className="px-3 py-1.5 bg-white border border-neutral-200 text-neutral-600 shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors rounded-[6px] text-[13px] font-bold"
              >
                Déconnecter
              </button>
            </div>
          ) : (
            <button
              onClick={async () => {
                if (!userInfo?.uid) return;
                try {
                  await openOAuthPopup({ toolName: 'google_calendar', provider: 'google' }, userInfo.uid);
                  const status = await checkAuthStatus('google_calendar', userInfo.uid);
                  setCalendarConnected(status.authenticated);
                  setCalendarEmail((status as any).accountEmail || '');
                  if (status.authenticated) toast.success('Google Agenda connecté !');
                } catch (e: any) {
                  toast.error(e?.message || 'Connexion annulée.');
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200 text-neutral-900 shadow-sm hover:bg-neutral-50 transition-colors rounded-[6px] text-[13px] font-bold"
            >
              <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Connecter
            </button>
          )}
        </div>
      )}
    </div>
  );

  const RaccourcisContent = () => {
    const groups = shortcutsList.reduce((acc, curr) => {
      if (!acc[curr.group]) acc[curr.group] = [];
      acc[curr.group].push(curr);
      return acc;
    }, {} as Record<string, typeof shortcutsList>);
    return (
      <div>
        <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-2">Raccourcis clavier</h2>
        <p className="text-[14px] text-neutral-500 mb-8">Claire fonctionne avec ces commandes simples. Cliquez sur un raccourci pour le modifier.</p>
        <div className="space-y-8">
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName}>
              <p className="text-[14px] font-bold text-neutral-900 mb-4">{groupName}</p>
              <div className="space-y-1 border-t border-neutral-100 pt-2">
                {items.map(item => (
                  <button
                    key={item.id} type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingShortcutId(item.id); }}
                    className="w-full flex items-center justify-between py-3 px-2 -mx-2 rounded-[6px] cursor-pointer transition-colors outline-none hover:bg-neutral-50"
                  >
                    <p className="text-[14px] text-neutral-700 font-medium">{item.label}</p>
                    <div className="flex gap-1.5 h-6 items-center overflow-hidden">
                      <AnimatePresence mode="wait">
                        {editingShortcutId === item.id ? (
                          <motion.span key="editing" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.15 }} className="text-neutral-500 text-[12px] font-semibold animate-pulse">
                            Appuyez sur une touche...
                          </motion.span>
                        ) : (
                          <motion.div key="keys" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }} className="flex gap-1.5">
                            {item.keys.map((k, i) => (
                              <span key={i} className="inline-flex items-center justify-center min-w-[24px] px-1.5 h-6 bg-white border border-neutral-200 rounded text-[11px] font-semibold text-neutral-600 shadow-sm">{k}</span>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ProfilContent = () => (
    <div>
      <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-8">Détails du profil</h2>
      <div className="space-y-8">

        {/* Profile */}
        <div className="pb-8 border-b border-neutral-100">
          <p className="text-[13px] font-bold text-neutral-900 mb-4">Profil</p>
          <motion.div layout>
            <AnimatePresence mode="wait" initial={false}>
              {!isEditingProfile ? (
                <motion.div 
                  key="view" 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 10 }} 
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#A88B7D] flex items-center justify-center text-lg font-bold text-white shadow-sm">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[14px] font-semibold text-neutral-900">{getUserDisplayName()}</span>
                  </div>
                  <button onClick={() => setIsEditingProfile(true)} className="text-[13px] font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors">
                    Mettre à jour le profil
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="edit" 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 20 }} 
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="border border-neutral-200 rounded-[8px] p-5 shadow-sm"
                >
                  <p className="text-[14px] font-bold text-neutral-900 mb-6">Mettre à jour le profil</p>
                  
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 rounded-full bg-[#A88B7D] flex items-center justify-center text-xl font-bold text-white shadow-sm shrink-0">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <button type="button" className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white text-[12px] font-bold rounded-[6px] transition-colors">
                          Choisir
                        </button>
                        <button type="button" className="px-3 py-1.5 text-red-500 hover:text-red-600 text-[12px] font-bold transition-colors">
                          Retirer
                        </button>
                      </div>
                      <p className="text-[12px] text-neutral-500">Recommended size 1:1, up to 10MB.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 mb-8">
                    <div className="flex-1">
                      <label className="block text-[13px] font-bold text-neutral-900 mb-1.5">First name</label>
                      <input type="text" value={profileFirstName} onChange={e => setProfileFirstName(e.target.value)} placeholder="Prénom"
                        className="w-full bg-white border border-neutral-200 rounded-[6px] px-3 py-2 text-[13px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all shadow-sm placeholder:text-neutral-400" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[13px] font-bold text-neutral-900 mb-1.5">Last name</label>
                      <input type="text" value={profileLastName} onChange={e => setProfileLastName(e.target.value)} placeholder="Last name"
                        className="w-full bg-white border border-neutral-200 rounded-[6px] px-3 py-2 text-[13px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all shadow-sm placeholder:text-neutral-400" />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-4 mt-4 pt-4 border-t border-neutral-100">
                    <button type="button" onClick={() => setIsEditingProfile(false)} className="text-[13px] font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors">Cancel</button>
                    <button type="button" onClick={handleSaveProfile} disabled={isSavingProfile}
                      className="px-5 py-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-[13px] font-semibold rounded-[6px] transition-colors shadow-sm disabled:opacity-60">
                      {isSavingProfile ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Email */}
        <div className="pb-8 border-b border-neutral-100">
          <p className="text-[13px] font-bold text-neutral-900 mb-4">Adresses e-mail</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-medium text-neutral-900">{userInfo?.email || 'email@exemple.com'}</span>
                <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">Principal</span>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowEmailOptions(!showEmailOptions)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-md hover:bg-neutral-100"
                >
                  <MoreHorizontal size={18} />
                </button>
                <AnimatePresence>
                  {showEmailOptions && (
                    <>
                      <div className="fixed inset-0 z-[10]" onClick={() => setShowEmailOptions(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-1 w-48 bg-white border border-neutral-200 rounded-[8px] shadow-lg py-1 z-[20] overflow-hidden"
                      >
                        <button 
                          onClick={() => { setIsEditingEmail(true); setShowEmailOptions(false); }}
                          className="w-full text-left px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                          Changer l'adresse e-mail
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <motion.div layout>
              <AnimatePresence mode="wait">
                {isEditingEmail && (
                  <motion.div 
                    key="edit-email-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="border border-neutral-200 rounded-[8px] p-5 shadow-sm"
                  >
                    <p className="text-[14px] font-bold text-neutral-900 mb-1">Changer l'adresse e-mail</p>
                    <p className="text-[13px] text-neutral-500 mb-6">Vous devrez vérifier cette nouvelle adresse e-mail avant qu'elle ne soit mise à jour.</p>
                    
                    <div className="mb-6">
                      <label className="block text-[13px] font-bold text-neutral-900 mb-1.5">Nouvelle adresse e-mail</label>
                      <input 
                        type="email" 
                        value={newEmailInput}
                        onChange={e => setNewEmailInput(e.target.value)}
                        placeholder="Entrez la nouvelle adresse e-mail"
                        className="w-full bg-white border border-neutral-200 rounded-[6px] px-3 py-2 text-[13px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all shadow-sm placeholder:text-neutral-400"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-4">
                      <button 
                        type="button" 
                        onClick={() => { setIsEditingEmail(false); setNewEmailInput(''); }}
                        className="text-[13px] font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
                      >
                        Annuler
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setIsSavingEmail(true); setTimeout(() => { setIsSavingEmail(false); setIsEditingEmail(false); setNewEmailInput(''); }, 1000); }}
                        disabled={!newEmailInput || isSavingEmail}
                        className="px-4 py-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-[13px] font-semibold rounded-[6px] transition-colors shadow-sm disabled:opacity-60"
                      >
                        {isSavingEmail ? 'Mise à jour...' : 'Mettre à jour'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Connected accounts */}
        <div>
          <p className="text-[13px] font-bold text-neutral-900 mb-4">Comptes connectés</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  <div className="flex items-center gap-1.5 text-[14px]">
                    <span className="font-semibold text-neutral-900">Google</span>
                    <span className="text-neutral-400">•</span>
                    <span className="text-neutral-500">{userInfo?.email || 'email@exemple.com'}</span>
                  </div>
                </div>
                <button className="text-neutral-400 hover:text-neutral-600 transition-colors"><MoreHorizontal size={18} /></button>
              </div>
            <button className="flex items-center gap-2 text-[13px] font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors">
              <Plus size={16} strokeWidth={2.5} /> Connecter un compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const SecuriteContent = () => (
    <div>
      <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-8">Sécurité</h2>
      <div className="space-y-8">

        {/* Password */}
        <div className="pb-8 border-b border-neutral-100">
          <p className="text-[13px] font-bold text-neutral-900 mb-4">Mot de passe</p>
          <motion.div layout>
            <AnimatePresence mode="wait" initial={false}>
              {!isEditingPassword ? (
                <motion.div 
                  key="view" 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 10 }} 
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between"
                >
                  {hasPassword ? (
                    <>
                      <span className="text-[14px] text-neutral-900 tracking-widest font-bold">••••••••</span>
                      <button 
                        type="button" 
                        onClick={() => setIsEditingPassword(true)}
                        className="text-[13px] font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
                      >
                        Mettre à jour le mot de passe
                      </button>
                    </>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => setIsEditingPassword(true)}
                      className="text-[13px] font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
                    >
                      Définir un mot de passe
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="edit" 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 20 }} 
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="border border-neutral-200 rounded-[8px] p-5 shadow-sm"
                >
                  <p className="text-[14px] font-bold text-neutral-900 mb-6">
                    {hasPassword ? "Mettre à jour le mot de passe" : "Définir un mot de passe"}
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-[13px] font-bold text-neutral-900 mb-1.5">Nouveau mot de passe</label>
                      <div className="relative">
                        <input 
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-[6px] pl-3 pr-10 py-2 text-[13px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all shadow-sm"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {showNewPassword ? (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </>
                            ) : (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-neutral-900 mb-1.5">Confirmer le mot de passe</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full bg-white border border-neutral-200 rounded-[6px] pl-3 pr-10 py-2 text-[13px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all shadow-sm"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {showConfirmPassword ? (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </>
                            ) : (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group mb-6">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={signOutOthers}
                        onChange={(e) => setSignOutOthers(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className={`w-[18px] h-[18px] border-[1.5px] rounded-[5px] transition-all flex items-center justify-center shadow-sm 
                        ${signOutOthers ? 'bg-[#0ea5e9] border-[#0ea5e9]' : 'bg-white border-neutral-300 group-hover:border-neutral-400'}`}
                      >
                        <Check 
                          size={12} 
                          strokeWidth={4.5} 
                          className={`text-white transition-all duration-200 ${signOutOthers ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} 
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-neutral-900 mb-0.5">Se déconnecter de tous les autres appareils</p>
                      <p className="text-[13px] text-neutral-500">Il est recommandé de se déconnecter de tous les autres appareils qui auraient pu utiliser votre ancien mot de passe.</p>
                    </div>
                  </label>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                    <button 
                      type="button" 
                      onClick={() => setIsEditingPassword(false)}
                      className="px-4 py-1.5 text-[13px] font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
                    >
                      Annuler
                    </button>
                    <button 
                      type="button"
                      onClick={handleSavePassword}
                      disabled={isSavingPassword}
                      className="px-4 py-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-[13px] font-semibold rounded-[6px] transition-colors shadow-sm disabled:opacity-60"
                    >
                      {isSavingPassword ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>


        {/* Active devices */}

        <div className="pb-8 border-b border-neutral-100">
          <p className="text-[13px] font-bold text-neutral-900 mb-6">Appareils actifs</p>
          {isLoadingDevices ? (
            <p className="text-[13px] text-neutral-500">Chargement des appareils...</p>
          ) : (
            <div className="space-y-6">
              {devices.map(device => (
                <div key={device.id} className="flex items-start gap-4">
                  <div className="w-8 h-6 bg-neutral-800 rounded border border-neutral-700 mt-0.5 shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0.5 bg-neutral-900 rounded-sm" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-neutral-900">{device.name}</span>
                        {device.isCurrent && <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">Cet appareil</span>}
                      </div>
                      {!device.isCurrent && (
                        <button onClick={() => handleRevokeDevice(device.id)} className="text-neutral-400 hover:text-red-500 transition-colors" title="Déconnecter">
                          <MoreHorizontal size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-[13px] text-neutral-500 mb-0.5">{device.browser}</p>
                    {device.ip && <p className="text-[13px] text-neutral-500 mb-1">{device.ip}{device.location ? ` (${device.location})` : ''}</p>}
                    <p className="text-[12px] text-neutral-400">{device.lastSeen}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete account */}
        <div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="text-[13px] font-semibold text-red-500 hover:text-red-600 transition-colors">
              Supprimer le compte
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="border border-red-200 rounded-[8px] p-5 bg-red-50">
              <p className="text-[14px] font-bold text-neutral-900 mb-2">Supprimer le compte</p>
              <p className="text-[13px] text-neutral-600 mb-4">Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer.</p>
              <input
                type="text" value={confirmDeleteText} onChange={e => setConfirmDeleteText(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full bg-white border border-red-200 rounded-[6px] px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-red-400"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setConfirmDeleteText(''); }} className="px-4 py-1.5 text-[13px] font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">Annuler</button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmDeleteText !== 'SUPPRIMER' || isDeletingAccount}
                  className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold rounded-[6px] transition-colors disabled:opacity-50"
                >
                  {isDeletingAccount ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );

  const LangageContent = () => (
    <div>
      <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-2">Langue</h2>
      <p className="text-[14px] text-neutral-500 mb-8">Sélectionnez la langue que vous souhaitez utiliser pour vos réunions.</p>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-[6px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-neutral-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div>
              <p className="text-[14px] font-bold text-neutral-900">Langue de transcription</p>
              <p className="text-[13px] text-neutral-500 mt-0.5">Langue que vous parlez en réunion (AssemblyAI).</p>
            </div>
          </div>
          <CustomSelect
            options={['Français (recommandé)', 'English', 'Español', 'Deutsch', 'Italiano', 'Português']}
            value={transcriptionLang}
            onChange={v => { setTranscriptionLang(v); updateUserSettings({ transcriptionLang: v }).catch(() => {}); }}
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-[6px] bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
              <Languages size={20} className="text-neutral-500" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-neutral-900">Langue de sortie</p>
              <p className="text-[13px] text-neutral-500 mt-0.5">Votre langue préférée pour l'IA et les notes.</p>
            </div>
          </div>
          <CustomSelect
            options={['Français', 'English', 'Español', 'Deutsch', 'Italiano', 'Português']}
            value={outputLang}
            onChange={v => { setOutputLang(v); updateUserSettings({ outputLang: v }).catch(() => {}); }}
          />
        </div>
      </div>
    </div>
  );

  const FacturationContent = () => (
    <div>
      <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-2">Facturation</h2>
      <p className="text-[14px] text-neutral-500 mb-8">Gérez votre abonnement et vos informations de facturation.</p>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <CreditCard size={48} className="text-neutral-200 mb-4" strokeWidth={1.5} />
        <p className="text-[15px] font-semibold text-neutral-900 mb-1">Aucune facturation active</p>
        <p className="text-[13px] text-neutral-500">Vous êtes actuellement sur le plan gratuit.</p>
      </div>
    </div>
  );

  const NotesContent = () => (
    <div>
      <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-2">Notes de version</h2>
      <p className="text-[14px] text-neutral-500 mb-8">Les dernières mises à jour de Claire.</p>
      <div className="space-y-6">
        {[
          { v: version || '2.0.1', date: 'Mai 2026', notes: ['Nouveau design du modal Paramètres', 'Connexion backend des préférences utilisateur', 'Persistance des raccourcis clavier', 'Test du microphone en temps réel'] },
          { v: '1.9.0', date: 'Avril 2026', notes: ['Amélioration du flux de connexion Electron', 'Correction de la synchronisation des sessions'] },
        ].map(item => (
          <div key={item.v} className="border-b border-neutral-100 pb-6 last:border-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[14px] font-bold text-neutral-900">v{item.v}</span>
              <span className="text-[12px] text-neutral-400">{item.date}</span>
            </div>
            <ul className="space-y-1.5">
              {item.notes.map(n => (
                <li key={n} className="flex items-start gap-2 text-[13px] text-neutral-600">
                  <span className="text-neutral-300 mt-1">•</span>{n}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  const AideContent = () => (
    <div>
      <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-2">Centre d'aide</h2>
      <p className="text-[14px] text-neutral-500 mb-8">Trouvez des réponses à vos questions.</p>
      <button
        onClick={() => window.open('https://support.clairia.app', '_blank', 'noopener,noreferrer')}
        className="flex items-center justify-between w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-[8px] hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Globe size={18} className="text-neutral-500" />
          <span className="text-[14px] font-semibold text-neutral-900">Ouvrir le centre d'aide</span>
        </div>
        <ChevronRight size={16} className="text-neutral-400" />
      </button>
    </div>
  );

  const ContactContent = () => (
    <div>
      <h2 className="text-[22px] font-bold text-neutral-900 tracking-tight mb-2">Contact Support</h2>
      <p className="text-[14px] text-neutral-500 mb-8">Notre équipe est disponible pour vous aider.</p>
      <button
        onClick={() => window.open('mailto:support@clairia.app', '_blank')}
        className="flex items-center justify-between w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-[8px] hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <HelpCircle size={18} className="text-neutral-500" />
          <span className="text-[14px] font-semibold text-neutral-900">support@clairia.app</span>
        </div>
        <ChevronRight size={16} className="text-neutral-400" />
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "general":     return GeneralContent();
      case "calendrier":  return CalendarContent();
      case "raccourcis":  return RaccourcisContent();
      case "profil":      return ProfilContent();
      case "securite":    return SecuriteContent();
      case "langage":     return LangageContent();
      case "facturation": return FacturationContent();
      case "notes":       return NotesContent();
      case "aide":        return AideContent();
      case "contact":     return ContactContent();
      default:            return null;
    }
  };

  return (
    <AnimatePresence onExitComplete={() => { document.body.style.overflow = ''; }}>
      {isOpen && (
        <motion.div
          key="settings-modal-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[960px] h-[720px] max-h-[92vh] bg-white rounded-2xl flex overflow-hidden shadow-2xl shadow-black/10 ring-1 ring-black/5"
            onClick={e => e.stopPropagation()}
          >
            {/* LEFT SIDEBAR */}
            <div className="w-[240px] bg-[#f9fafb] border-r border-neutral-200 flex flex-col pt-4 pb-6 overflow-y-auto shrink-0">
              <div className="px-4 mb-6">
                <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-[6px] text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200/50 transition-colors">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex flex-col gap-0.5 px-3">
                <NavItem tabId="general"     icon={Settings}   label="Général" />
                <NavItem tabId="calendrier"  icon={Calendar}   label="Calendrier" />
                <NavItem tabId="raccourcis"  icon={Keyboard}   label="Raccourcis" />
                <NavItem tabId="profil"      icon={User}       label="Profil" />
                <NavItem tabId="securite"    icon={Shield}     label="Sécurité" />
                <NavItem tabId="langage"     icon={Languages}  label="Langue" />
                <NavItem tabId="facturation" icon={CreditCard} label="Facturation" />
              </div>
              <div className="mt-8 px-6 mb-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Support</span>
              </div>
              <div className="flex flex-col gap-0.5 px-3">
                <NavItem tabId="notes" icon={FileText} label="Notes de version" />
                <button
                  type="button"
                  onClick={() => openInBrowser('https://support.clairia.app')}
                  className="flex items-center gap-3 px-3 py-2 rounded-[6px] w-full text-left font-medium transition-all duration-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                  style={{ fontSize: '13.5px' }}
                >
                  <Globe size={16} className="shrink-0" strokeWidth={2} />
                  <span>Centre d'aide</span>
                </button>
                <button
                  type="button"
                  onClick={() => openInBrowser('mailto:support@clairia.app')}
                  className="flex items-center gap-3 px-3 py-2 rounded-[6px] w-full text-left font-medium transition-all duration-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                  style={{ fontSize: '13.5px' }}
                >
                  <HelpCircle size={16} className="shrink-0" strokeWidth={2} />
                  <span>Contact Support</span>
                </button>
              </div>
              <div className="mt-auto pt-6 flex flex-col gap-0.5 px-3">
                <button
                  onClick={() => { handleLogout(); onClose(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[6px] w-full text-left font-medium text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  style={{ fontSize: '13.5px' }}
                >
                  <LogOut size={16} strokeWidth={2} className="shrink-0" />
                  <span>Se déconnecter</span>
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined' && (window as any).api?.common?.quitApplication) {
                      (window as any).api.common.quitApplication();
                    } else {
                      onClose();
                    }
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[6px] w-full text-left font-medium text-neutral-500 hover:bg-neutral-200/50 hover:text-neutral-800 transition-colors"
                  style={{ fontSize: '13.5px' }}
                >
                  <Power size={16} strokeWidth={2} className="shrink-0" />
                  <span>Quitter Claire</span>
                </button>
              </div>
            </div>

            {/* RIGHT CONTENT */}
            <div key={activeTab} className="flex-1 bg-white overflow-y-auto px-12 py-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {renderContent()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
