'use client';

import { useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, TRANSLATION_PROVIDERS, TranslationProvider } from '@/lib/translator';
import type { Translation } from '@/lib/supabase';
import { trpc } from '@/lib/client';

export default function Home() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sourceLang') || 'en';
    }
    return 'en';
  });
  const [targetLang, setTargetLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('targetLang') || 'zh';
    }
    return 'zh';
  });
  const [provider, setProvider] = useState<TranslationProvider>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('provider') as TranslationProvider) || 'googletranslate';
    }
    return 'googletranslate';
  });

  const { data: notes = [], refetch: refetchNotes } = trpc.notes.getAll.useQuery();
  const translateMutation = trpc.translate.translate.useMutation();
  const createNoteMutation = trpc.notes.create.useMutation();
  const deleteNoteMutation = trpc.notes.delete.useMutation();

  useEffect(() => {
    localStorage.setItem('sourceLang', sourceLang);
  }, [sourceLang]);

  useEffect(() => {
    localStorage.setItem('targetLang', targetLang);
  }, [targetLang]);

  useEffect(() => {
    localStorage.setItem('provider', provider);
  }, [provider]);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    try {
      const result = await translateMutation.mutateAsync({
        text: sourceText,
        sourceLang,
        targetLang,
        provider,
      });

      setTranslatedText(result.translatedText);
    } catch (error) {
      console.error('Translation failed:', error);
      alert(error instanceof Error ? error.message : 'Translation failed. Try another provider.');
    }
  };

  const handleSaveNote = async () => {
    if (!sourceText.trim() || !translatedText.trim()) return;

    try {
      await createNoteMutation.mutateAsync({
        source_text: sourceText,
        translated_text: translatedText,
        source_lang: sourceLang,
        target_lang: targetLang,
      });

      alert('Note saved successfully!');
      refetchNotes();
    } catch (error) {
      console.error('Failed to save note:', error);
      alert('Failed to save note.');
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNoteMutation.mutateAsync(id);
      refetchNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Translation App
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Translation Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as TranslationProvider)}
              className="w-full p-2 border rounded-md bg-blue-50"
            >
              {TRANSLATION_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.limit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                From
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Enter text to translate..."
                className="w-full mt-2 p-3 border rounded-md h-32"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                To
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <textarea
                value={translatedText}
                readOnly
                placeholder="Translation will appear here..."
                className="w-full mt-2 p-3 border rounded-md h-32 bg-gray-50"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleTranslate}
              disabled={translateMutation.isPending || !sourceText.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              {translateMutation.isPending ? 'Translating...' : 'Translate'}
            </button>
            <button
              onClick={handleSaveNote}
              disabled={!sourceText.trim() || !translatedText.trim()}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-300"
            >
              Save Note
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Saved Translations
          </h2>
          <div className="space-y-4">
            {notes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No saved translations yet
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="border rounded-md p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 text-sm text-gray-600">
                      <span className="font-medium">
                        {note.source_lang.toUpperCase()} → {note.target_lang.toUpperCase()}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-gray-800 mb-1">{note.source_text}</p>
                  <p className="text-blue-700">→ {note.translated_text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
