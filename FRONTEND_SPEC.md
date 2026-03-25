# LexiGraph Frontend — Build Specification

## Scope (What to Build vs. Cut)

### Build
- File upload dashboard with status indicators
- Chat interface with streaming responses
- Source attribution cards per answer
- 2D knowledge graph visualization
- Auth pages (login / register)
- Protected routes

### Cut (from original spec)
- 3D graph visualization — weeks of work, worse UX than 2D
- Playwright E2E tests — not worth setup time for portfolio
- Summary Mode — low value for demonstrating the core concept

---

## Tech Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | Next.js 15 (App Router) | Industry standard, pairs with Vercel |
| Styling | Tailwind CSS + shadcn/ui | Fastest path to professional UI |
| Data fetching | TanStack Query | Clean loading/error state handling |
| Streaming | Vercel AI SDK (`useChat`) | Abstracts streaming complexity |
| Graph viz | React Flow | Easier API than D3, cleaner output |
| Forms | React Hook Form + Zod | Pairs naturally with shadcn/ui |
| Deployment | Vercel | Free, zero config for Next.js |

---

## Pages

Three pages only:

```
/          → Dashboard (upload + document list)
/chat      → Chat interface
/graph     → Knowledge graph visualization
```

---

## Layout

Sidebar + main area. Sidebar collapses to top nav on mobile.

```
┌─────────────────────────────────────────────┐
│  LexiGraph          [Dashboard][Chat][Graph] │  ← mobile nav
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │        Main Content Area         │
│          │                                  │
│ Doc list │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

---

## Design Rules

### Color
Use one accent color only. Let shadcn/ui handle everything else.

```typescript
// tailwind.config.ts
extend: {
  colors: {
    brand: '#6366f1' // indigo
  }
}
```

### Typography
Do not change shadcn/ui typography defaults. This is where most
amateur UIs break — the defaults are professionally designed.

### Components
Use shadcn/ui components exclusively. Do not build custom UI
primitives. Custom effort goes into layout and spacing only.

### Loading States
Use loading skeletons (shadcn Skeleton component), not spinners.
Every async action needs a loading and error state.

---

## Build Order

Build in this order — each phase produces a working demo.

### Phase 1 — Shell
- Next.js 15 setup with shadcn/ui initialized
- Sidebar layout with navigation between pages
- Login and Register pages calling `/auth/login` and `/auth/register`
- Protected route wrapper (redirect to /login if no token)
- Store JWT in httpOnly cookie or localStorage (cookie preferred)

### Phase 2 — Dashboard
- Drag and drop file upload using `react-dropzone`
- Calls `POST /ingest` with multipart form data
- Upload progress indicator (shadcn Progress component)
- Ingested documents list with filename and upload date
- URL ingestion input field alongside file upload

### Phase 3 — Chat
- Chat interface using Vercel AI SDK `useChat` hook
- Streaming text responses without layout shifts
- Source attribution cards rendered below each assistant message
  - Vector sources: show content snippet + similarity score
  - Graph sources: show entity relationships (e.g. A -[WORKS_AT]-> B)
- Optimistic UI — user message appears instantly before response

### Phase 4 — Graph
- React Flow canvas rendering nodes and edges from Neo4j
- Node color coded by entity type:
  - PERSON → blue
  - ORGANIZATION → purple  
  - CONCEPT → green
  - EVENT → orange
  - LOCATION → red
- Click a node to highlight its 1-hop neighborhood
- Sidebar panel showing node metadata on click

### Phase 5 — Polish
- Loading skeletons on every data fetch
- Empty states for document list and graph when no data
- Error boundaries and toast notifications (shadcn Toast)
- Mobile responsive pass
- Deploy to Vercel

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com
```

Never hardcode the API URL. All other config stays server-side.

---

## API Contract

All authenticated requests send:
```
Authorization: Bearer <access_token>
```

### Endpoints consumed

**Auth**
- `POST /auth/register` → `{ user, access_token, refresh_token }`
- `POST /auth/login` → `{ user, access_token, refresh_token }`
- `POST /auth/refresh` → `{ access_token }`

**Core**
- `POST /ingest` → multipart file or JSON body
- `POST /query` → `{ query: string }`

### Query response shape (updated backend)
```typescript
{
  answer: string,
  sources: {
    vector: Array<{
      content: string,
      metadata: Record<string, any>,
      similarity: number
    }>,
    graph: string[]   // e.g. ["PERSON_ALICE -[VISITED]-> ORG_NEO4J"]
  }
}
```

---

## Key Implementation Notes

### Streaming
Use Vercel AI SDK's `useChat` hook. It handles streaming,
message history, and loading state out of the box.

```typescript
const { messages, input, handleSubmit, isLoading } = useChat({
  api: `${process.env.NEXT_PUBLIC_API_URL}/query`,
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

Note: your backend needs to stream responses for this to work.
If it returns a single response, use `useSWRMutation` instead
and simulate streaming with a typewriter effect.

### Token Management
On login, store tokens and handle refresh:
```typescript
// Refresh when access token expires (Supabase default: 1 hour)
// Call POST /auth/refresh with refresh_token
// Replace stored access_token with new one
```

### Graph Data Fetching
The backend doesn't have a dedicated graph endpoint yet.
Two options:
1. Add `GET /graph` endpoint to backend that returns all nodes/edges
   for the current user from Neo4j — recommended
2. Parse graph relationships out of query responses — hacky, avoid

---

## Deployment

- Deploy to Vercel — connect GitHub repo, zero config for Next.js
- Set `NEXT_PUBLIC_API_URL` to your Render backend URL in
  Vercel's environment variables dashboard
- Vercel auto-deploys on every push to main
