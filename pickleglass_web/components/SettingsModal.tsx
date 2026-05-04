'use client';

import React, { useCallback, useEffect, useState, MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Calendar, Shield, Languages, CreditCard, 
  HelpCircle, MessageSquare, LogOut, Frown, User, Palette
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { logout } from '@/utils/api';
import { useRouter } from "next/navigation";
import { trackLogout } from '@/lib/gtag';
import { getElectronLoginPath, useElectronRuntime } from '@/utils/electron';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchClick: () => void;
}

type TabType = "profil" | "calendrier" | "personnalisation" | "securite" | "langage" | "facturation";

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user: userInfo } = useAuth();
  const isElectronRuntime = useElectronRuntime();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("profil");

  // Handle ESC closing & Body Scroll Lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const handleLogout = useCallback(async () => {
    try {
      trackLogout();
      await logout();
      window.location.href = isElectronRuntime === true ? getElectronLoginPath() : '/auth/login';
    } catch (error) {
      console.error('An error occurred during logout:', error);
    }
  }, [isElectronRuntime]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };



  const NavItem = ({ icon: Icon, label, tabId }: { icon: any, label: string, tabId: TabType }) => {
    const isActive = activeTab === tabId;
    return (
      <button 
        onClick={() => setActiveTab(tabId)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left
          ${isActive ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'}`}
      >
        <Icon size={18} className="shrink-0" />
        <span>{label}</span>
      </button>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "profil":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1">Profil</h2>
            <p className="text-sm text-neutral-500 mb-8">Gérez vos informations personnelles.</p>
            {/* Contenu vierge pour ton autre IA */}
          </div>
        );
      case "calendrier":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1">Calendrier</h2>
            <p className="text-sm text-neutral-500 mb-8">Paramétrez la synchronisation de vos agendas.</p>
            {/* Contenu vierge pour ton autre IA */}
          </div>
        );
      case "securite":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1">Sécurité</h2>
            <p className="text-sm text-neutral-500 mb-8">Gérez vos appareils et mots de passe.</p>
            {/* Contenu vierge pour ton autre IA */}
          </div>
        );
      case "langage":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1">Langage</h2>
            <p className="text-sm text-neutral-500 mb-8">Options de langue et transcription.</p>
            {/* Contenu vierge pour ton autre IA */}
          </div>
        );
      case "facturation":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1">Facturation</h2>
            <p className="text-sm text-neutral-500 mb-8">Gérez votre plan d'abonnement.</p>
            {/* Contenu vierge pour ton autre IA */}
          </div>
        );
      case "personnalisation":
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1">Personnalisation</h2>
            <p className="text-sm text-neutral-500 mb-8">Options d'interface.</p>
            {/* Contenu vierge pour ton autre IA */}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence onExitComplete={() => { document.body.style.overflow = ''; }}>
      {isOpen && (
        <motion.div 
          key="settings-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-[1000px] h-[750px] max-h-[90vh] bg-white border border-neutral-200 rounded-xl flex overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Left Sidebar */}
            <div className="w-[260px] bg-neutral-50 border-r border-neutral-200 flex flex-col overflow-y-auto custom-scrollbar relative z-10">
              
              {/* Close Button & Header area */}
              <div className="pt-4 pb-6 px-4">
                 <button 
                  onClick={onClose}
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200 rounded-md mb-2 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-0.5 px-3">
                <NavItem tabId="profil" icon={User} label="Profil" />
                <NavItem tabId="calendrier" icon={Calendar} label="Calendrier" />
                <NavItem tabId="personnalisation" icon={Palette} label="Personnalisation" />
                <NavItem tabId="securite" icon={Shield} label="Sécurité" />
                <NavItem tabId="langage" icon={Languages} label="Langage" />
                <NavItem tabId="facturation" icon={CreditCard} label="Facturation" />
              </div>

              <div className="mt-8 px-5 mb-2">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Support</h3>
              </div>
              <div className="flex flex-col gap-0.5 px-3">
                <button onClick={() => window.open("https://support.clairia.app", "_blank")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors w-full text-left">
                    <HelpCircle size={18} className="shrink-0" />
                    <span>Aide</span>
                </button>
                <button onClick={() => window.open("mailto:support@clairia.app", "_blank")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors w-full text-left">
                    <MessageSquare size={18} className="shrink-0" />
                    <span>Contact Support</span>
                </button>
              </div>

              <div className="mt-auto pt-6 pb-4 flex flex-col gap-0.5 px-3">
                 <button 
                  onClick={() => { handleLogout(); onClose(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut size={18} />
                  <span>Se déconnecter</span>
                </button>
                <button 
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors w-full text-left"
                >
                  <Frown size={18} />
                  <span>Quitter Claire</span>
                </button>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 bg-white overflow-y-auto relative">
               <div className="max-w-2xl mx-auto px-10 py-16">
                  {renderContent()}
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
