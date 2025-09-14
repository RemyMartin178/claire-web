'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Copy } from 'lucide-react'
import { getPresets, updatePreset, createPreset, PromptPreset } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'

export default function PersonalizePage() {
  const { user: userInfo, loading } = useAuth()
  const [allPresets, setAllPresets] = useState<PromptPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PromptPreset | null>(null);
  const [showPresets, setShowPresets] = useState(true);
  const [editorContent, setEditorContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

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
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to switch?")) {
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
        alert("Default presets cannot be modified.");
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
      alert("Failed to save preset. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewPreset = async () => {
    const title = prompt("Enter a title for the new preset:");
    if (!title) return;
    
    try {
      setSaving(true);
      const { id } = await createPreset({
        title,
        prompt: "Enter your custom prompt here..."
      });
      
      const newPreset: PromptPreset = {
        id,
        uid: 'current_user',
        title,
        prompt: "Enter your custom prompt here...",
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
      alert("Failed to create preset. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicatePreset = async () => {
    if (!selectedPreset) return;
    
    const title = prompt("Enter a title for the duplicated preset:", `${selectedPreset.title} (Copy)`);
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
      alert("Failed to duplicate preset. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !userInfo || isLoading) {
    return null
  }

  return (
    <div className="min-h-screen w-full flex flex-col gap-8 px-4 py-8 md:px-12 md:py-12 animate-fade-in" style={{ background: 'var(--main-surface-primary)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Personnaliser</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gérez vos préréglages personnalisés</p>
        </div>
                    <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNewPreset}
            disabled={saving}
            className="flex items-center gap-2 bg-[#9ca3af] hover:opacity-90 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow transition-all disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Nouveau préréglage
          </button>
          {selectedPreset && (
            <button
              onClick={handleDuplicatePreset}
              disabled={saving}
              className="flex items-center gap-2 bg-[#232329] border border-[#3a3a4a] text-white px-6 py-3 rounded-lg font-semibold text-lg shadow transition-all disabled:opacity-50"
            >
              <Copy className="w-5 h-5" />
              Dupliquer
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty || selectedPreset?.is_default === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-lg shadow transition-all ${
              !isDirty && !saving
                ? 'bg-[#232329] border border-[#3a3a4a] text-[#bbb] cursor-default'
                : saving 
                  ? 'bg-[#232329] border border-[#3a3a4a] text-[#bbb] cursor-not-allowed' 
                  : 'bg-[#9ca3af] text-white hover:opacity-90'
            }`}
          >
            {!isDirty && !saving ? 'Enregistré' : saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Section des préréglages */}
      <div className="bg-[#232329] rounded-xl p-6 border border-[#3a3a4a] shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Préréglages</h2>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-2 text-[#bbb] hover:text-white text-sm font-medium transition-colors"
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
                  p-4 rounded-lg cursor-pointer transition-all duration-200 bg-[#2a2a32]
                  h-48 flex flex-col shadow-sm hover:shadow-md relative border
                  ${selectedPreset?.id === preset.id
                    ? 'border-2 border-[#9ca3af] shadow-md'
                    : 'border-[#3a3a4a] hover:border-[#9ca3af]'
                  }
                `}
              >
                {preset.is_default === 1 && (
                  <div className="absolute top-2 right-2 bg-yellow-900/20 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/30">
                    Par défaut
                  </div>
                )}
                <h3 className="font-semibold text-white mb-3 text-center text-sm">
                  {preset.title}
                </h3>
                <p className="text-xs text-[#bbb] leading-relaxed flex-1 overflow-hidden">
                  {preset.prompt.substring(0, 100) + (preset.prompt.length > 100 ? '...' : '')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Éditeur de préréglage */}
      <div className="bg-[#232329] rounded-xl p-6 border border-[#3a3a4a] shadow">
        {selectedPreset?.is_default === 1 && (
          <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
              <p className="text-sm text-yellow-400">
                <strong>Ceci est un préréglage par défaut et ne peut pas être modifié.</strong> 
                Utilisez le bouton « Dupliquer » ci-dessus pour créer une copie modifiable, ou créez un nouveau préréglage.
              </p>
            </div>
          </div>
        )}
        <textarea
          value={editorContent}
          onChange={handleEditorChange}
          className="w-full h-64 text-sm text-white border-0 resize-none focus:outline-none bg-transparent font-mono leading-relaxed placeholder-[#bbb] rounded-lg p-4 bg-[#2a2a32] border border-[#3a3a4a]"
          placeholder="Sélectionnez un préréglage ou saisissez directement..."
          readOnly={selectedPreset?.is_default === 1}
        />
      </div>
    </div>
  );
} 
