```mermaid
flowchart LR
  subgraph Client [Browser]
    A[Register form submit]
    B[Login form submit]
    G[Continue with Google]
    N[Redirected with authSuccess/authError]
    C{Request includes sb_session cookie?}
    D[Protected tRPC call]
    E[Public tRPC call]
  end

  subgraph Server [Next.js]
    R[POST /api/auth/register]
    L[POST /api/auth/login]
    GStart[GET /api/auth/google]
    GCallback[GET /api/auth/google/callback]
    H[tRPC handler app/api/trpc/...]
    P[protectedProcedure (lib/trpc.ts)]
    Pub[publicProcedure (lib/trpc.ts)]
  end

  subgraph Supabase [Postgres]
    U[(users)]
    S[(sessions)]
  end

  subgraph Google
    GA[Accounts consent screen]
    GT[OAuth token endpoint]
    GU[Userinfo endpoint]
  end

  classDef db fill:#eef,stroke:#66a,stroke-width:1px;
  class U,S db;

  A --> R -->|hash password + insert| U
  R -->|201 id/email| A

  B --> L -->|verify bcrypt hash| U
  L -->|insert session| S
  L -->|Set-Cookie sb_session| N

  G --> GStart
  GStart -->|set state + verifier cookies| G
  GStart --> GA
  GA -->|redirect with code+state| GCallback
  GCallback -->|validate state + exchange code| GT
  GCallback -->|fetch profile| GU
  GCallback -->|upsert user| U
  GCallback -->|create session| S
  GCallback -->|Set-Cookie sb_session + redirect /?authSuccess=google| N

  N --> C
  C -->|yes| P
  C -->|no| Pub

  D -->|/api/trpc| H
  E -->|/api/trpc| H

  H -->|getSessionFromRequest| S
  H -->|load user| U
  H -->|ctx.session| Ctx[tRPC context]

  Ctx -->|SessionWithUser| P
  Ctx -->|null| Pub

  P -->|authorized| D
  P -->|no session| X[TRPCError UNAUTHORIZED]
  Pub --> E
```
