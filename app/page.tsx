'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  SUPPORTED_LANGUAGES,
  TRANSLATION_PROVIDERS,
  TranslationProvider,
} from '@/lib/translator';
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
      return (
        (localStorage.getItem('provider') as TranslationProvider) ||
        'googletranslate'
      );
    }
    return 'googletranslate';
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const sessionQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const session = sessionQuery.data?.user ?? null;

  const notesQuery = trpc.notes.getAll.useQuery(undefined, {
    enabled: Boolean(session),
    retry: false,
  });
  const notes: Translation[] = notesQuery.data ?? [];

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
      alert(
        error instanceof Error
          ? error.message
          : 'Translation failed. Try another provider.'
      );
    }
  };

  const performLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? 'Login failed');
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'register') {
        const registerResponse = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword }),
        });

        if (!registerResponse.ok) {
          const data = await registerResponse.json().catch(() => null);
          throw new Error(data?.error ?? 'Registration failed');
        }
      }

      await performLogin(authEmail, authPassword);
      await sessionQuery.refetch();
      await notesQuery.refetch();
      setAuthEmail('');
      setAuthPassword('');
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError(error instanceof Error ? error.message : 'Auth failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      await sessionQuery.refetch();
      await notesQuery.refetch();
    }
  };

  const handleSaveNote = async () => {
    if (!session) {
      alert('Sign in to save translations.');
      return;
    }

    if (!sourceText.trim() || !translatedText.trim()) return;

    try {
      await createNoteMutation.mutateAsync({
        source_text: sourceText,
        translated_text: translatedText,
        source_lang: sourceLang,
        target_lang: targetLang,
      });

      setAuthError(null);
      alert('Note saved successfully!');
      await notesQuery.refetch();
    } catch (error) {
      console.error('Failed to save note:', error);
      alert('Failed to save note.');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!session) {
      alert('Sign in to manage saved translations.');
      return;
    }

    try {
      await deleteNoteMutation.mutateAsync(id);
      await notesQuery.refetch();
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

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {session ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600">Signed in as</p>
                <p className="font-semibold text-gray-900">{session.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="self-start sm:self-auto bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Log out
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleAuthSubmit}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  {authMode === 'login' ? 'Sign in' : 'Create an account'}
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setAuthMode((mode) => (mode === 'login' ? 'register' : 'login'))
                  }
                  className="text-sm text-blue-600 hover:underline"
                >
                  {authMode === 'login'
                    ? 'Need an account? Register'
                    : 'Already have an account? Sign in'}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-gray-600">Email</span>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600">Password</span>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    minLength={8}
                    required
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    placeholder="Minimum 8 characters"
                  />
                </label>
              </div>

              {authError ? (
                <p className="text-sm text-red-600">{authError}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  {authMode === 'login'
                    ? 'Use your credentials to access saved translations.'
                    : 'Passwords are hashed with bcrypt before storage.'}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {authLoading
                  ? 'Submitting...'
                  : authMode === 'login'
                  ? 'Sign in'
                  : 'Register & Sign in'}
              </button>
            </form>
          )}
        </div>

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
              disabled={
                !session ||
                !sourceText.trim() ||
                !translatedText.trim() ||
                createNoteMutation.isPending
              }
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-300"
            >
              {createNoteMutation.isPending ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Saved Translations
          </h2>
          {!session ? (
            <p className="text-gray-500 text-center py-8">
              Sign in to keep a history of your translations.
            </p>
          ) : notesQuery.isLoading ? (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No saved translations yet
            </p>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="border rounded-md p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 text-sm text-gray-600">
                      <span className="font-semibold">{note.source_lang.toUpperCase()}</span>
                      <span>→</span>
                      <span className="font-semibold">{note.target_lang.toUpperCase()}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-gray-800">
                    <div>
                      <p className="text-xs text-gray-500">Source</p>
                      <p>{note.source_text}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Translation</p>
                      <p>{note.translated_text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
