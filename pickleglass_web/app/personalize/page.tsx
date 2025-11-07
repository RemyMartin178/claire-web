'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronDown, Plus, Copy } from 'lucide-react'
import { getPresets, updatePreset, createPreset, PromptPreset } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { Page, PageHeader } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/utils/firebase'

function PersonalizeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isDesktopMode = searchParams.get('desktop') === 'true'
  const { user: userInfo, loading } = useAuth()
  const [allPresets, setAllPresets] = useState<PromptPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PromptPreset | null>(null);
  const [showPresets, setShowPresets] = useState(true);
  const [editorContent, setEditorContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Handle desktop mode authentication
  useEffect(() => {
    if (isDesktopMode && !userInfo && !loading) {
      // Show login prompt for desktop mode
      console.log('[Personalize] Desktop mode detected, user not logged in');
    }
  }, [isDesktopMode, userInfo, loading]);

  // Handle successful authentication in desktop mode
  useEffect(() => {
    if (isDesktopMode && userInfo && !loading) {
      handleDesktopAuth();
    }
  }, [isDesktopMode, userInfo, loading]);

  const handleDesktopAuth = async () => {
    try {
      const sessionId = 'sess-' + Math.random().toString(36).slice(2, 15);
      const idToken = await (userInfo as any).getIdToken?.();
      
      if (!idToken) {
        console.error('[Personalize] Failed to get ID token');
        return;
      }

      console.log('[Personalize] Creating session for desktop app:', sessionId);
      
      // Associate the session with the user's custom token
      const response = await fetch('/api/mobile-auth/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken, session_id: sessionId })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('[Personalize] Session created, redirecting to success page');
        router.push(`/auth/success?flow=mobile&session_id=${sessionId}`);
      } else {
        console.error('[Personalize] Failed to create session:', data.error);
      }
    } catch (error) {
      console.error('[Personalize] Error in desktop auth:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isDesktopMode) return;
    
    setIsAuthenticating(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // The useEffect above will handle the rest
    } catch (error) {
      console.error('[Personalize] Google sign in failed:', error);
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const presetsData = await getPresets();
        setAllPresets(presetsData);
        
        if (presetsData.length > 0) {
          const firstUserPreset = presetsData.find(p => p.is_default === 0) || presetsData[0];
          setSelectedPreset(firstUserPreset);
          setEditorContent(firstUserPreset.prompt);
        }
      } catch (error) {
        console.error("Failed to fetch presets:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handlePresetClick = (preset: PromptPreset) => {
    if (isDirty && !window.confirm("Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir changer ?")) {
        return;
    }
    setSelectedPreset(preset);
    setEditorContent(preset.prompt);
    setIsDirty(false);
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!selectedPreset || saving || !isDirty) return;
    
    if (selectedPreset.is_default === 1) {
        alert("Les préréglages par défaut ne peuvent pas être modifiés.");
        return;
    }
    
    try {
      setSaving(true);
      await updatePreset(selectedPreset.id, { 
        title: selectedPreset.title, 
        prompt: editorContent 
      });

      setAllPresets(prev => 
        prev.map(p => 
          p.id === selectedPreset.id 
            ? { ...p, prompt: editorContent }
            : p
          )
        );
      setIsDirty(false);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Échec de l'enregistrement du préréglage. Voir la console pour plus de détails.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewPreset = async () => {
    const title = prompt("Entrez un titre pour le nouveau préréglage :");
    if (!title) return;
    
    try {
      setSaving(true);
      const { id } = await createPreset({
        title,
        prompt: "Entrez votre prompt personnalisé ici..."
      });
      
      const newPreset: PromptPreset = {
        id,
        uid: 'current_user',
        title,
        prompt: "Entrez votre prompt personnalisé ici...",
        is_default: 0,
        created_at: Date.now(),
        sync_state: 'clean'
      };
      
      setAllPresets(prev => [...prev, newPreset]);
      setSelectedPreset(newPreset);
      setEditorContent(newPreset.prompt);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to create preset:", error);
      alert("Échec de la création du préréglage. Voir la console pour plus de détails.");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicatePreset = async () => {
    if (!selectedPreset) return;
    
    const title = prompt("Entrez un titre pour le préréglage dupliqué :", `${selectedPreset.title} (Copie)`);
    if (!title) return;
    
    try {
      setSaving(true);
      const { id } = await createPreset({
        title,
        prompt: editorContent
      });
      
      const newPreset: PromptPreset = {
        id,
        uid: 'current_user',
        title,
        prompt: editorContent,
        is_default: 0,
        created_at: Date.now(),
        sync_state: 'clean'
      };
      
      setAllPresets(prev => [...prev, newPreset]);
      setSelectedPreset(newPreset);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to duplicate preset:", error);
      alert("Échec de la duplication du préréglage. Voir la console pour plus de détails.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  // Desktop mode: Show login screen if not authenticated
  if (isDesktopMode && !userInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">Connexion à Claire</h1>
              <p className="text-gray-600">
                Connectez-vous avec Google pour synchroniser votre compte avec l'application de bureau Claire
              </p>
            </div>
            
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md transform transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{isAuthenticating ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
            </button>
            
            <p className="text-sm text-gray-500">
              En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <Page>
      <PageHeader
        title="Personnaliser"
        description="Gérez vos préréglages personnalisés"
        actions={
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreateNewPreset}
              disabled={saving}
              variant="secondary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouveau préréglage
            </Button>
            {selectedPreset && (
              <Button
                onClick={handleDuplicatePreset}
                disabled={saving}
                variant="outline"
              >
                <Copy className="w-5 h-5 mr-2" />
                Dupliquer
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty || selectedPreset?.is_default === 1}
            >
              {!isDirty && !saving ? 'Enregistré' : saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        }
      />

      {/* Section des préréglages */}
      <Card className="bg-white mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold text-[#282828]">Préréglages</h2>
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-2 text-gray-600 hover:text-[#282828] text-sm font-medium transition-colors"
            >
              <ChevronDown 
                className={`h-4 w-4 transition-transform duration-200 ${showPresets ? 'rotate-180' : ''}`}
              />
              {showPresets ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          
          {showPresets && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allPresets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all duration-200
                    h-48 flex flex-col shadow-sm hover:shadow-md relative border
                    ${selectedPreset?.id === preset.id
                      ? 'border-2 border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50 bg-white'
                    }
                  `}
                >
                  {preset.is_default === 1 && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                      Par défaut
                    </Badge>
                  )}
                  <h3 className="font-heading font-semibold text-[#282828] mb-3 text-center text-sm">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed flex-1 overflow-hidden">
                    {preset.prompt.substring(0, 100) + (preset.prompt.length > 100 ? '...' : '')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Éditeur de préréglage */}
      <Card className="bg-white">
        <CardContent className="p-6">
          {selectedPreset?.is_default === 1 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                <p className="text-sm text-yellow-800">
                  <strong>Ceci est un préréglage par défaut et ne peut pas être modifié.</strong> 
                  Utilisez le bouton « Dupliquer » ci-dessus pour créer une copie modifiable, ou créez un nouveau préréglage.
                </p>
              </div>
            </div>
          )}
          <Textarea
            value={editorContent}
            onChange={handleEditorChange}
            className="w-full h-64 font-mono"
            placeholder="Sélectionnez un préréglage ou saisissez directement..."
            readOnly={selectedPreset?.is_default === 1}
          />
        </CardContent>
      </Card>
    </Page>
  );
}

export default function PersonalizePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-gray-500">Chargement...</div></div>}>
      <PersonalizeContent />
    </Suspense>
  );
}
