```
flowchart TD
    A[User clicks Continue with Google] --> B[/GET /api/auth/google/]
    B -->|Generate state + PKCE, set cookie| C[Redirect to Google OAuth consent]
    C --> D{User approves?}
    D -->|No| E[Google redirects with error]
    E --> F[Return error and clear cookies]
    D -->|Yes| G[Google redirects with code + state]
    G --> H[/GET /api/auth/google/callback/]
    H -->|Validate state + PKCE| I[Exchange code for tokens]
    I --> J[Fetch Google profile sub, email, name]
    J --> K[Upsert user in Supabase via service role]
    K --> L[Create session row + sb_session cookie]
    L --> M[Redirect back to app home/dashboard]
    M --> N[Client loads, calls /api/auth/me]
    N -->|Session valid| O[Show authenticated features]
    N -->|No session| P[Prompt sign-in modal]
```