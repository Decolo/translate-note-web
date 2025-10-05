```
flowchart LR
    subgraph Client [Browser]
      A["Register Form Submit"]
      B["Login Form Submit"]
      C{"Send request with sb_session cookie?"}
      D["Protected tRPC Call (e.g. notes.getAll)"]
      E["Public tRPC Call (e.g. translate)"]
    end

    subgraph Server [Next.js]
      R["POST /api/auth/register"]
      L["POST /api/auth/login"]
      H["tRPC Handler app/api/trpc/[trpc]/route.ts"]
      P["protectedProcedure (lib/trpc.ts)"]
      Pub["publicProcedure (lib/trpc.ts)"]
    end

    subgraph Supabase [Postgres]
      U[(users)]:::db
      T[(sessions)]:::db
    end

    classDef db fill:#eef,stroke:#66a,stroke-width:1px;

    A --> R
    R -->|hash password| U
    R -->|201 id/email| A

    A --> B
    B --> L
    L -->|verify credentials| U
    L -->|insert session token| T
    L -->|Set-Cookie sb_session| B

    D -->|fetch /api/trpc| H
    C -->|no| Pub
    C -->|yes| P

    H -->|getSessionFromRequest| T
    H -->|load user if session valid| U
    H -->|ctx.session| Context

    Context -->|null| Pub
    Context -->|SessionWithUser| P

    P -->|authorized| D
    P -->|no session| X["TRPCError UNAUTHORIZED"]
    Pub --> E
    Pub -->|session optional| D
```

