'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Copy } from 'lucide-react'
import { getPresets, updatePreset, createPreset, PromptPreset } from '@/utils/api'

export default function PersonalizePage() {
  const [allPresets, setAllPresets] = useState<PromptPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PromptPreset | null>(null);
  const [showPresets, setShowPresets] = useState(true);
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-white">
      <div className="bg-card-bg border-b border-sidebar-border text-white">
        <div className="px-8 pt-8 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-[#9ca3af] mb-2">Préréglages</p>
              <h1 className="text-3xl font-bold text-white">Personnaliser</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateNewPreset}
                disabled={saving}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-accent-light text-white hover:opacity-90 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouveau préréglage
              </button>
              {selectedPreset && (
                <button
                  onClick={handleDuplicatePreset}
                  disabled={saving}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-accent-light text-white hover:opacity-90 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Dupliquer
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !isDirty || selectedPreset?.is_default === 1}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  !isDirty && !saving
                    ? 'bg-card-bg text-[#9ca3af] cursor-default'
                    : saving 
                      ? 'bg-card-bg text-[#9ca3af] cursor-not-allowed' 
                      : 'bg-accent-light text-white hover:opacity-90'
                }`}
              >
                {!isDirty && !saving ? 'Enregistré' : saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`transition-colors duration-300 bg-[#343541] text-white`}>
        <div className="px-8 py-6">
          <div className="mb-6">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-2 text-[#9ca3af] hover:text-white text-sm font-medium transition-colors"
            >
              <ChevronDown 
                className={`h-4 w-4 transition-transform duration-200 ${showPresets ? 'rotate-180' : ''}`}
              />
              {showPresets ? 'Hide Presets' : 'Show Presets'}
            </button>
          </div>
          
          {showPresets && (
            <div className="grid grid-cols-5 gap-4 mb-6">
              {allPresets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all duration-200 bg-card-bg
                    h-48 flex flex-col shadow-sm hover:shadow-md relative
                    ${selectedPreset?.id === preset.id
                      ? 'border-2 border-accent-light shadow-md'
                      : 'border border-sidebar-border hover:border-accent-light'
                    }
                  `}
                >
                  {preset.is_default === 1 && (
                    <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Default
                    </div>
                  )}
                  <h3 className="font-semibold text-white mb-3 text-center text-sm">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-[#9ca3af] leading-relaxed flex-1 overflow-hidden">
                    {preset.prompt.substring(0, 100) + (preset.prompt.length > 100 ? '...' : '')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-[#343541] text-white">
        <div className="h-full px-8 py-6 flex flex-col">
          {selectedPreset?.is_default === 1 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                <p className="text-sm text-yellow-800">
                  <strong>Ceci est un préréglage par défaut et ne peut pas être modifié.</strong> 
                  Utilisez le bouton « Dupliquer » ci-dessus pour créer une copie modifiable, ou créez un nouveau préréglage.
                </p>
              </div>
            </div>
          )}
          <textarea
            value={editorContent}
            onChange={handleEditorChange}
            className="w-full flex-1 text-sm text-white border-0 resize-none focus:outline-none bg-transparent font-mono leading-relaxed placeholder-[#9ca3af]"
            placeholder="Sélectionnez un préréglage ou saisissez directement..."
            readOnly={selectedPreset?.is_default === 1}
          />
        </div>
      </div>
    </div>
  );
} 