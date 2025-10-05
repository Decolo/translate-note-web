import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/server';
import { getSessionFromRequest } from '@/lib/session-token';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => ({
      session: await getSessionFromRequest(req),
    }),
  });

export { handler as GET, handler as POST };
