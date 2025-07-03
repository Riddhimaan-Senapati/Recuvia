# Recuvia - Lost and Found Platform 🔍

Recuvia is a modern web application designed to help people find their lost items 🏷️ and report found items 📦 using AI-powered image and text search capabilities. The platform leverages vector embeddings and semantic search to match items through advanced analysis. 

## ✨ Features

- **User Authentication**: Secure login 🔐 and registration system using Supabase Auth.
- **Dual-Purpose Interface**: Separate tabs for searching lost items 🕵️‍♀️ and reporting found items 📝.
- **AI-Powered Search**: 
  - Text-based semantic search for lost items 🔎
  - Image-based similarity search using computer vision 📸
  - Cross-search capability to find similar items from an existing item 🔗
- **Customizable Vector Search**: 
  - Users can adjust the similarity threshold to control how closely results must match their query (lower threshold = more results, higher = stricter match) 📊
  - Users can set the maximum number of results returned per search, including an "all" option or a custom value 🔢
  - These controls are available for both text and image search in the main search interface 🎛️


## 💻 Technology Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS ⚛️
- **Backend**: Next.js API Routes (Serverless Functions) ☁️
- **Authentication**: Supabase Auth 🔑
- **Database**: Supabase for storing images, image embeddings and searching vector embeddings 🗃️
- **AI Models**: CLIP (Contrastive Language-Image Pre-training) for generating image and text embeddings 🧠
- **Deployment**: Vercel 🚀

## 💡 How It Works

1. **Finding Lost Items**: 
   - Users can search for lost items using text descriptions 💬
   - Users can upload an image to find visually similar items 🖼️
   - The system converts the query (text or image) into vector embeddings ➡️
   - Supabase performs similarity search to find matching items ✅

2. **Reporting Found Items**: 
   - Users upload an image of the found item with details 📤
   - The system generates vector embeddings for the image ➕
   - The item is stored in the database and becomes searchable 💾

3. **Cross-Search**: 
   - Users can click on any item to find similar items 🔄
   - This helps connect people who lost items with those who found them 🤝

## 🛠️ Development

### Prerequisites

- Node.js 18+ and npm 🟢
- Supabase account 🔑

### Setup

1. Clone the repository ⬇️
2. Install dependencies: `npm install` 📦
3. Set up environment variables (see `.env.example`) ⚙️
4. **Initialize Supabase database:** 
   - Open your Supabase project 🚀
   - Go to the SQL Editor 📜
   - Run the SQL script found at `frontend/supabase_script.sql` to create the required tables, functions, and extensions for vector search ➕
5. Run development server: `npm run dev` ▶️

### Deployment

The application is deployed on Vercel with the following considerations:
- Serverless function timeout limits (60 seconds) ⏱️
- Memory constraints (1024 MB) 🧠
- Proper caching for AI models 💨

## 🚀 Future Enhancements

- Geolocation-based search 📍
- Real-time notifications 🔔
- Chat functionality between users 💬
- Mobile app version 📱

## 📜 License

MIT

## 🤝 Contributors

- Riddhimaan Senapati

# 📂 Structure
```
├── README.md
├── LICENSE
├── docker-compose.yaml
├── .env.example
└── frontend/
    ├── .cache/
    ├── .eslintrc.json
    ├── .gitignore
    ├── .next/
    ├── app/
    ├── components/
    ├── components.json
    ├── contexts/
    ├── hooks/
    ├── lib/
    ├── middleware.ts
    ├── next-env.d.ts
    ├── next.config.js
    ├── package.json
    ├── package-lock.json
    ├── postcss.config.js
    ├── providers/
    ├── scripts/
    ├── supabase_script.sql
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── vercel.json
```

## 📄 File Descriptions

*   **`README.md`**: The primary documentation file 📚 for the project, providing an overview, setup instructions, and the codebase structure.
*   **`LICENSE`**: Contains the licensing information ⚖️ for the project (MIT License).
*   **`docker-compose.yaml`**: Defines and runs multi-container Docker applications 🐳. It configures the services, networks, and volumes for the frontend.
*   **`.env.example`**: A template file 📝 for environment variables, showing the necessary variables without their actual values.
*   **`frontend/`**: The root directory for the Next.js frontend application 🌐.
    *   **`.cache/`**: Contains cached data ⚡ for development, used to speed up build times.
    *   **`.eslintrc.json`**: ESLint configuration file 🧹 for enforcing consistent coding styles and catching errors in JavaScript/TypeScript code.
    *   **`.gitignore`**: Specifies files and directories that Git should ignore 🚫, preventing them from being committed to the repository.
    *   **`.next/`**: The build output directory 🏗️ for Next.js, containing compiled code and assets for production.
    *   **`app/`**: The Next.js App Router directory 🚀, where pages, layouts, and API routes are defined.
    *   **`components/`**: Houses reusable UI components 🧩 used throughout the application.
    *   **`components.json`**: Configuration file for `shadcn/ui` components 🎨, often used to manage component setup and theming.
    *   **`contexts/`**: Contains React Context API providers 🤝 for managing global state.
    *   **`hooks/`**: Custom React hooks 🎣 for encapsulating reusable logic.
    *   **`lib/`**: Utility functions and helper modules 🛠️.
    *   **`middleware.ts`**: Next.js middleware file 🚦 for executing code before a request is completed, useful for authentication or routing.
    *   **`next-env.d.ts`**: TypeScript declaration file 📝 for Next.js environment variables.
    *   **`next.config.js`**: Next.js configuration file ⚙️ for customizing build behavior, webpack settings, and more.
    *   **`package.json`**: Defines project metadata 📦 and lists all direct dependencies and scripts.
    *   **`package-lock.json`**: Records the exact version of each dependency 🔒, ensuring consistent installations across environments.
    *   **`postcss.config.js`**: PostCSS configuration file 🖌️, typically used with Tailwind CSS for processing CSS.
    *   **`providers/`**: Contains React Context providers or other high-level providers 🔗 for application-wide functionalities (e.g., theme provider).
    *   **`scripts/`**: Contains utility scripts 📜 for various development tasks.
    *   **`supabase_script.sql`**: SQL script 📄 for initializing and configuring the Supabase database.
    *   **`tailwind.config.ts`**: Tailwind CSS configuration file 🌈 for customizing the design system.
    *   **`tsconfig.json`**: TypeScript configuration file 🏷️ for compiling TypeScript code.
    *   **`vercel.json`**: Configuration file for Vercel deployment 🚀, specifying build commands and routes.