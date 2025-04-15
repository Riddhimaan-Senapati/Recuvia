# Recuvia - Lost and Found Platform

Recuvia is a modern web application designed to help people find their lost items and report found items using AI-powered image and text search capabilities. The platform leverages vector embeddings and semantic search to match lost items with found items based on visual and textual similarity.

## Features

- **User Authentication**: Secure login and registration system using Supabase Auth
- **Dual-Purpose Interface**: Separate tabs for searching lost items and reporting found items
- **AI-Powered Search**: 
  - Text-based semantic search for lost items
  - Image-based similarity search using computer vision
  - Cross-search capability to find similar items from an existing item


## Technology Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless Functions)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for image files
- **Vector Database**: Milvus for storing and searching vector embeddings
- **AI Models**: CLIP (Contrastive Language-Image Pre-training) for generating image and text embeddings
- **Deployment**: Vercel

## How It Works

1. **Finding Lost Items**:
   - Users can search for lost items using text descriptions
   - Users can upload an image to find visually similar items
   - The system converts the query (text or image) into vector embeddings
   - Milvus performs similarity search to find matching items

2. **Reporting Found Items**:
   - Users upload an image of the found item with details
   - The system generates vector embeddings for the image
   - The item is stored in the database and becomes searchable

3. **Cross-Search**:
   - Users can click on any item to find similar items
   - This helps connect people who lost items with those who found them

## Development

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Milvus database (cloud or self-hosted)

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run development server: `npm run dev`

### Deployment

The application is deployed on Vercel with the following considerations:
- Serverless function timeout limits (60 seconds)
- Memory constraints (1024 MB)
- Proper caching for AI models

## Future Enhancements

- Geolocation-based search
- Real-time notifications
- Chat functionality between users
- Mobile app version

## License

MIT

## Contributors

- Riddhimaan Senapati