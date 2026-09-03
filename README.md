# Recuvia

Recuvia is a lost-and-found platform. Search for lost items by text or by image, and report found items. CLIP turns text and images into vectors, and Supabase Postgres (pgvector) finds the matches.

## Features

- Sign in and sign up with Supabase Auth (email/password or Google OAuth).
- Search lost items by text description or by uploading an image.
- Click any item to find visually similar items.
- Tune the similarity threshold and the maximum number of results.
- Report a found item with a photo, title, description, and location.

## Technology stack

| Layer | What it is |
| --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js route handlers (serverless functions) |
| Auth | Supabase Auth via `@supabase/ssr` |
| Database | Supabase Postgres with pgvector |
| Storage | Supabase Storage |
| AI models | CLIP (`@xenova/transformers`) |
| Deploy | Vercel |
| Lint and format | oxlint and oxfmt |

## How it works

1. Search by text or image. The query becomes a vector embedding.
2. Supabase runs the similarity search over item embeddings.
3. Uploading a found item embeds its image and stores it, so it becomes searchable.

## Development

### Prerequisites

- Node.js 22+ and npm.
- Docker, for the local Supabase stack.
- A Supabase account, for the remote project.

### Setup

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Copy `frontend/.env.example` to `frontend/.env` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. From `frontend`, start the local Supabase stack: `npx supabase start`.
5. Run `supabase_script.sql` against the local database. It creates the `items` table, the `match_items` function, the `items_with_email` view, and the row-level-security policies.
6. Create the public `item-images` storage bucket. The schema script does not create it.
7. Run `npm run dev`.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Build for production. It downloads the CLIP model first. |
| `npm run start` | Start the production server. |
| `npm run typecheck` | Run TypeScript type checking. |
| `npm run lint` | Run oxlint. |
| `npm run format` | Format the tree with oxfmt. |
| `npm run format:check` | Check formatting with oxfmt. |

## Project structure

```
├── README.md
├── LICENSE
├── docker-compose.yaml
└── frontend/
    ├── app/
    │   ├── api/                  # Route handlers (upload, delete, search)
    │   ├── auth/                 # Sign in, sign up, OAuth callback
    │   ├── utils/                # Supabase clients, embeddings, search helpers
    │   └── ...                   # Pages: home, main, contact, privacy, terms
    ├── components/
    │   ├── ui/                   # shadcn/ui primitives
    │   └── ...                   # AuthShell, UploadForm, SearchPanel, ResultsGrid
    ├── contexts/                 # AuthContext
    ├── hooks/                    # useUpload, useSearch
    ├── lib/                      # Utility helpers
    ├── providers/                # ThemeProvider
    ├── scripts/                  # download-models.js
    ├── supabase/                 # Local Supabase CLI config
    ├── components.json
    ├── dockerfile
    ├── proxy.ts
    ├── next.config.js
    ├── postcss.config.js
    ├── supabase_script.sql
    ├── tsconfig.json
    └── vercel.json
```

## Deployment

The app deploys to Vercel. Route handlers run as serverless functions with a 60-second timeout. `@xenova/transformers` is kept external in `next.config.js`, and its models are cached.

## License

MIT

## Contributors

- Riddhimaan Senapati
