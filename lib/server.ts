import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './trpc';
import { translateText } from './translator';
import { supabase } from './supabase';

const translateRouter = router({
  translate: protectedProcedure
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
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('user_id', ctx.session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }),

  create: protectedProcedure
    .input(z.object({
      source_text: z.string(),
      translated_text: z.string(),
      source_lang: z.string(),
      target_lang: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await supabase
        .from('translations')
        .insert([
          {
            ...input,
            user_id: ctx.session.user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      const { error } = await supabase
        .from('translations')
        .delete()
        .eq('id', id)
        .eq('user_id', ctx.session.user.id);

      if (error) throw error;
      return { success: true };
    }),
});

const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ({
    user: ctx.session?.user ?? null,
  })),
});

export const appRouter = router({
  translate: translateRouter,
  notes: notesRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
