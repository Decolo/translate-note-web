'use client';

import { Fragment, FormEvent, useEffect, useState } from 'react';
import { Dialog, Tab, Transition } from '@headlessui/react';
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
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('zh');
  const [provider, setProvider] = useState<TranslationProvider>('googletranslate');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  const openAuthModal = (mode?: 'login' | 'register') => {
    if (mode) {
      setAuthMode(mode);
    }
    setAuthError(null);
    setAuthPassword('');
    setIsAuthOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthOpen(false);
    setAuthPassword('');
    setAuthError(null);
    setAuthMode('login');
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedSource = localStorage.getItem('sourceLang');
    const storedTarget = localStorage.getItem('targetLang');
    const storedProvider = localStorage.getItem('provider');

    if (storedSource) {
      setSourceLang(storedSource);
    }

    if (storedTarget) {
      setTargetLang(storedTarget);
    }

    if (storedProvider && TRANSLATION_PROVIDERS.some((p) => p.id === storedProvider)) {
      setProvider(storedProvider as TranslationProvider);
    }

    setHasHydrated(true);
  }, []);

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
    if (!hasHydrated || typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('sourceLang', sourceLang);
  }, [sourceLang, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('targetLang', targetLang);
  }, [targetLang, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('provider', provider);
  }, [provider, hasHydrated]);

  const handleTranslate = async () => {
    if (!session) {
      alert('Sign in to translate text.');
      await sessionQuery.refetch();
      return;
    }

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
      const errorWithData =
        typeof error === 'object' && error !== null && 'data' in error
          ? (error as { data?: { code?: string } })
          : null;

      if (errorWithData?.data?.code === 'UNAUTHORIZED') {
        alert('Sign in to translate text.');
        await sessionQuery.refetch();
        return;
      }

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
      closeAuthModal();
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-6 py-12 text-center shadow-2xl md:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200">
              Translate · Store · Revisit
            </p>
            {session ? (
              <div className="flex items-center gap-3 text-left sm:text-right">
                <span className="truncate rounded-full border border-slate-800 bg-slate-950/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
                  {session.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-full border border-red-400/40 bg-red-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-red-200 transition hover:border-red-400 hover:bg-red-500/20"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100 transition hover:border-indigo-400 hover:bg-indigo-500/30"
              >
                Access account
              </button>
            )}
          </div>
          <h1 className="mt-6 text-4xl font-bold text-white sm:text-5xl">
            Translation Studio
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
            Craft translations, compare providers, and curate personal language notes — powered by a custom Supabase auth flow.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(320px,4fr)]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur xl:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Translation Workspace</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose your languages, experiment with different providers, and keep your favorite results.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                Live Preview
              </span>
            </div>

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Provider
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRANSLATION_PROVIDERS.map((p) => {
                  const isActive = provider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      className={
                        'group flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-400/60 ' +
                        (isActive
                          ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600 hover:text-slate-100')
                      }
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-slate-400 group-hover:text-slate-200">
                        {p.limit}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-200">From</label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
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
                  className="mt-3 h-40 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-200">To</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
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
                  className="mt-3 h-40 w-full rounded-2xl border border-slate-800 bg-slate-950/20 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleTranslate}
                disabled={
                  !session || translateMutation.isPending || !sourceText.trim()
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {translateMutation.isPending ? 'Translating…' : 'Translate'}
              </button>
              <button
                onClick={handleSaveNote}
                disabled={
                  !session ||
                  !sourceText.trim() ||
                  !translatedText.trim() ||
                  createNoteMutation.isPending
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-400/60 bg-emerald-500/20 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/40 disabled:text-slate-500"
              >
                {createNoteMutation.isPending ? 'Saving…' : 'Save To Notebook'}
              </button>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur lg:p-8">
            {session ? (
              <div className="flex h-full flex-col gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Account
                  </p>
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                    <p className="text-sm text-slate-400">Signed in with</p>
                    <p className="mt-2 truncate text-lg font-semibold text-white">
                      {session.email}
                    </p>
                    <p className="mt-4 text-xs text-slate-500">
                      Sessions issue `sb_session` cookies tied to Supabase. Removing a session row invalidates future requests immediately.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5 text-xs text-slate-400">
                  <p className="text-sm font-semibold text-slate-200">Switch accounts?</p>
                  <p className="mt-2">
                    Use the Log out control above, then reopen the access modal to sign in with a different address.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Account
                  </p>
                  <h2 className="mt-4 text-2xl font-semibold text-white">
                    Sync your private notebook
                  </h2>
                  <p className="mt-3 text-sm text-slate-400">
                    Sign in to save translations securely and recall them from any browser session.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-300">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      <span>Bring your own provider keys for DeepSeek or Gemini.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-indigo-400" />
                      <span>All sessions backed by custom Supabase tables — no hosted auth SDK.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span>Notes are scoped per user; removing a session severs access instantly.</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3 text-sm">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-3 font-semibold text-slate-100 transition hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  >
                    Create an account
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>

        <section className="mt-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur lg:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Saved Translations
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your personal notebook of source phrases and polished results.
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                History
              </p>
            </div>

            {!session ? (
              <p className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/40 py-10 text-center text-slate-400">
                Sign in to keep a history of your translations.
              </p>
            ) : notesQuery.isLoading ? (
              <p className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/40 py-10 text-center text-slate-400">
                Loading your notebook…
              </p>
            ) : notes.length === 0 ? (
              <p className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/40 py-10 text-center text-slate-400">
                No saved translations yet.
              </p>
            ) : (
              <div className="mt-8 space-y-5">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 transition hover:border-indigo-500/40 hover:bg-slate-950/55"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                        <span>{note.source_lang.toUpperCase()}</span>
                        <span className="text-slate-500">→</span>
                        <span>{note.target_lang.toUpperCase()}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-xs font-semibold text-rose-200 transition hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                          Source
                        </p>
                        <p className="mt-2 text-sm text-slate-100">{note.source_text}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                          Translation
                        </p>
                        <p className="mt-2 text-sm text-slate-100">{note.translated_text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <Transition appear show={isAuthOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeAuthModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center px-4 py-10">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-xl transition-all sm:p-8">
                  <button
                    type="button"
                    onClick={closeAuthModal}
                    className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
                    aria-label="Close auth modal"
                  >
                    X
                  </button>
                  <Dialog.Title className="text-center text-2xl font-semibold text-white">
                    {authMode === 'login' ? 'Sign in to continue' : 'Create your account'}
                  </Dialog.Title>
                  <Dialog.Description className="mt-2 text-center text-sm text-slate-400">
                    Access your Supabase-backed translation notebook with a custom session token flow.
                  </Dialog.Description>

                  <Tab.Group
                    selectedIndex={authMode === 'login' ? 0 : 1}
                    onChange={(index) => {
                      setAuthMode(index === 0 ? 'login' : 'register');
                      setAuthError(null);
                      setAuthPassword('');
                    }}
                  >
                    <Tab.List className="mt-6 grid grid-cols-2 gap-2 rounded-full border border-slate-800 bg-slate-900/60 p-1">
                      <Tab
                        className={({ selected }) =>
                          'rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ' +
                          (selected
                            ? 'bg-slate-950 text-white shadow'
                            : 'text-slate-400 hover:text-slate-100')
                        }
                      >
                        Sign in
                      </Tab>
                      <Tab
                        className={({ selected }) =>
                          'rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ' +
                          (selected
                            ? 'bg-slate-950 text-white shadow'
                            : 'text-slate-400 hover:text-slate-100')
                        }
                      >
                        Register
                      </Tab>
                    </Tab.List>

                    <Tab.Panels className="mt-6">
                      <Tab.Panel>
                        <form className="flex flex-col gap-5" onSubmit={handleAuthSubmit}>
                          <label className="text-sm text-slate-300">
                            Email
                            <input
                              type="email"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              required
                              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                              placeholder="you@example.com"
                            />
                          </label>
                          <label className="text-sm text-slate-300">
                            Password
                            <input
                              type="password"
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              minLength={8}
                              required
                              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                              placeholder="Minimum 8 characters"
                            />
                          </label>

                          {authError ? (
                            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                              {authError}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">
                              Use the credentials you registered with to unlock saved translations.
                            </p>
                          )}

                          <button
                            type="submit"
                            disabled={authLoading}
                            className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-slate-700"
                          >
                            {authLoading ? 'Submitting…' : 'Sign in'}
                          </button>
                        </form>
                      </Tab.Panel>
                      <Tab.Panel>
                        <form className="flex flex-col gap-5" onSubmit={handleAuthSubmit}>
                          <label className="text-sm text-slate-300">
                            Email
                            <input
                              type="email"
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              required
                              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                              placeholder="you@example.com"
                            />
                          </label>
                          <label className="text-sm text-slate-300">
                            Password
                            <input
                              type="password"
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              minLength={8}
                              required
                              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                              placeholder="Minimum 8 characters"
                            />
                          </label>

                          {authError ? (
                            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                              {authError}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">
                              Passwords are hashed with bcrypt before storage; we only keep salted digests.
                            </p>
                          )}

                          <button
                            type="submit"
                            disabled={authLoading}
                            className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                          >
                            {authLoading ? 'Submitting…' : 'Register & Sign in'}
                          </button>
                        </form>
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
