'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Copy } from 'lucide-react'
import { getPresets, updatePreset, createPreset, PromptPreset } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { Page, PageHeader } from '@/components/Page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

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

  if (loading || !userInfo || isLoading) {
    return null
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
