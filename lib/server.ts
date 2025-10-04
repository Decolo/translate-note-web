import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { translateText } from './translator';
import { supabase } from './supabase';

const translateRouter = router({
  translate: publicProcedure
    .input(z.object({
      text: z.string(),
      sourceLang: z.string(),
      targetLang: z.string(),
      provider: z.enum(['mymemory', 'lingva', 'googletranslate', 'deepseek', 'gemini']).optional(),
    }))
    .mutation(async ({ input }) => {
      return await translateText(input);
    }),
});

const notesRouter = router({
  getAll: publicProcedure
    .query(async () => {
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }),

  create: publicProcedure
    .input(z.object({
      source_text: z.string(),
      translated_text: z.string(),
      source_lang: z.string(),
      target_lang: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from('translations')
        .insert([input])
        .select();

      if (error) throw error;
      return data[0];
    }),

  delete: publicProcedure
    .input(z.string())
    .mutation(async ({ input: id }) => {
      const { error } = await supabase
        .from('translations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    }),
});

export const appRouter = router({
  translate: translateRouter,
  notes: notesRouter,
});

export type AppRouter = typeof appRouter;
