# AGENTS.md

## What this is

Recuvia is a lost-and-found app. Users search for lost items by text or by image, and report found items. CLIP turns text and images into vectors, and Supabase Postgres with pgvector finds the matches.

The app lives in `frontend/`. There is no separate backend. Next.js route handlers do the server work.

## Stack

| Layer | What it is |
| --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4 |
| Auth | Supabase Auth via `@supabase/ssr` |
| Database | Supabase Postgres with pgvector |
| Storage | Supabase Storage |
| AI models | CLIP via `@xenova/transformers` |
| Deploy | Vercel |
| Lint and format | oxlint and oxfmt |

## Commands

Run from `frontend/`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Build for production. It downloads the CLIP model first. |
| `npm run start` | Start the production server. |
| `npm run typecheck` | Run TypeScript type checking. |
| `npm run lint` | Run oxlint. |
| `npm run format` | Format the tree with oxfmt. |
| `npm run format:check` | Check formatting with oxfmt. |
| `npx tsc --noEmit` | Same as `npm run typecheck`. |
| `npx knip` | Find unused files, dependencies, and exports. |

The gate before shipping is `npm run build`, `npx tsc --noEmit`, `npx oxlint`, and `npx oxfmt --check`. All four must pass.

## Code map

```
frontend/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          # Upload a found item (auth required)
│   │   ├── delete/route.ts          # Delete an item (owner or admin)
│   │   └── search/
│   │       ├── image/route.ts       # Image similarity search
│   │       └── text/route.ts        # Text semantic search
│   ├── auth/                        # signin, signup, callback pages
│   ├── utils/
│   │   ├── supabase.ts              # Singleton client, search/insert/delete helpers, constants
│   │   ├── supabase-browser.ts      # createBrowserSupabaseClient (@supabase/ssr)
│   │   ├── supabase-server.ts       # createServerSupabaseClient (@supabase/ssr)
│   │   └── embeddings.ts            # CLIP model loading, getImageEmbedding/getTextEmbedding, formatResults
│   ├── main/page.tsx                # Coordinator page, owns useSearch
│   └── page.tsx                     # Home page
├── components/
│   ├── AuthShell.tsx                # Shared sign-in / sign-up shell
│   ├── UploadForm.tsx               # Found-item upload form
│   ├── SearchPanel.tsx              # Search controls and progress
│   ├── ResultsGrid.tsx              # Search result cards
│   └── ui/                          # shadcn/ui primitives (8 files)
├── contexts/AuthContext.tsx         # AuthProvider + useAuth
├── hooks/
│   ├── useSearch.ts                 # Search state and handlers
│   └── useUpload.ts                 # Upload state and handlers
├── lib/utils.ts                     # cn() helper (clsx + tailwind-merge)
├── providers/ThemeProvider.tsx      # next-themes
├── scripts/download-models.js       # Pre-downloads the CLIP model
├── proxy.ts                         # CORS proxy for /api/:path*
├── supabase_script.sql              # Schema: items, match_items, items_with_email, RLS
├── next.config.js
├── tsconfig.json
└── supabase/                        # Local Supabase CLI config
```

## How a request flows

### Text search

1. `useSearch` in `hooks/useSearch.ts` POSTs the query to `/api/search/text`.
2. The route calls `getTextEmbedding(query)` in `app/utils/embeddings.ts`.
3. It calls `searchByVector(vector, limit, threshold)` in `app/utils/supabase.ts`.
4. `searchByVector` runs the `match_items` RPC, then joins emails from the `items_with_email` view.
5. The route formats results with `formatResults` and returns them.

### Image search

The same path, but `/api/search/image` calls `getImageEmbedding(buffer, mimeType)` instead.

### Upload

1. `useUpload` POSTs a multipart form to `/api/upload`.
2. The route creates a request-scoped client with `createServerSupabaseClient`, gets the session, and rejects unauthenticated calls.
3. It uploads the image to the `item-images` bucket and gets its public URL.
4. It embeds the image, then inserts the item with a retry loop.

### Delete

1. `useSearch` POSTs `{ itemId, fileName }` to `/api/delete`.
2. The route gets the session, loads the item, and checks the caller is the owner or the admin email `riddhimaan22@gmail.com`.
3. It deletes the database row, then removes the storage file from `item-images`.

### Auth

`AuthProvider` in `contexts/AuthContext.tsx` creates one browser client, listens to auth changes, and redirects. Signed-in users on `/auth/*` go to `/main`. Signed-out users on `/main` go to `/auth/signin`.

## Conventions

- **Components** go in `components/`. Feature components live next to `ui/`, not inside it. `components/ui/` only holds shadcn primitives.
- **Hooks** go in `hooks/`. Keep state and its handlers in the hook, not in the page. The page is a coordinator.
- **Shared logic** goes in `app/utils/`. Model loading and embedding live in `embeddings.ts`. Supabase data helpers live in `supabase.ts`.
- **Client and server Supabase clients are separate.** Use `createBrowserSupabaseClient` in client components. Use `createServerSupabaseClient` in route handlers. Never use the singleton in a client component; it is for server-side helpers only.
- **Tailwind is CSS-first.** Color and radius tokens live in `app/globals.css` under `@theme inline`. To add a color, add a CSS variable in `:root` and `.dark`, then map it in `@theme inline`. Do not use a `tailwind.config.ts`.
- **Model loading is lazy and shared.** `embeddings.ts` loads the CLIP models on first use and caches them. Do not load models per request.
- **`@xenova/transformers` is pinned and external.** It stays in `serverExternalPackages` in `next.config.js`.
- **Notifications use sonner.** Call `toast.success` or `toast.error`, not `alert`.
- **API routes that take a body set `runtime = "nodejs"` and `dynamic = "force-dynamic"`.** Add an `OPTIONS` handler for CORS preflight.
- **Write real file and symbol names.** Do not describe them with synonyms.

## Add a feature

### Add a page

1. Create `app/<route>/page.tsx`.
2. Mark it `"use client"` if it uses hooks or the auth context.
3. Add it to the router by placing the file in `app/`. No route registration is needed.
4. Run the gate.

### Add an API route

1. Create `app/api/<name>/route.ts`.
2. Use `createServerSupabaseClient` for any authenticated work.
3. Set `export const runtime = "nodejs"`, `export const dynamic = "force-dynamic"`, and `export const maxDuration = 60`.
4. Add an `OPTIONS` handler if the client needs CORS.
5. Run the gate.

### Add a search or embedding path

1. Put the embedding logic in `app/utils/embeddings.ts`.
2. Call `searchByVector` from `app/utils/supabase.ts`.
3. Format the result with `formatResults`.
4. Run the gate.

### Add a new search option

1. Add the state and the handler to `hooks/useSearch.ts`.
2. Add the control to `components/SearchPanel.tsx`.
3. Pass the value through the request body in the handler.
4. Read it in the matching route.

## Remove a feature

1. Delete the file or the handler.
2. Run `npx knip` to find any unused dependencies, exports, or files left behind.
3. Remove the now-unused dependencies with `npm uninstall`.
4. Run the gate. `npx tsc --noEmit` will catch an import that points at a deleted file.

## Optimize

- **Dedupe before you add.** If two routes or components repeat logic, extract it into `app/utils/` or a shared component.
- **Keep the embedding code in one place.** `embeddings.ts` is the single source for model loading and embedding. Do not duplicate it in a route.
- **Reuse the search helpers.** `searchByVector`, `insertItemWithEmbedding`, and `deleteItemById` in `app/utils/supabase.ts` take a client. Pass the request-scoped client from the route.
- **Find dead code with knip.** Run `npx knip` after a refactor and remove what it flags. It flags dev tools that it cannot see used, so verify before deleting those.
- **Keep the dependency tree small.** Prefer a library over hand-rolled code. If the app does what a maintained library already does, use the library.
- **Do not touch the `@xenova/transformers` version.** It is pinned on purpose.

## Gotchas

- `@next/swc-wasm-nodejs` is a direct dependency but knip reports it unused. It is a Next.js sub-package. Leave it.
- The `item-images` storage bucket is created manually. The schema script does not create it.
- Delete removes the storage file only when a `fileName` is sent. Keep that in mind when calling the route.
- `supabase_script.sql` is not a migration. Apply it directly, or it will not run automatically.
- The singleton in `app/utils/supabase.ts` uses the anon key and is for public, read-only work. Use the request-scoped client for anything that needs the user.
- `proxy.ts` is the middleware replacement. In Next.js 16 the `middleware.ts` convention is deprecated. Do not create `middleware.ts`.
