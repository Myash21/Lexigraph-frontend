# LexiGraph — Knowledge Graph Visualizer & Query Engine

LexiGraph is a modern AI-powered platform that transforms your static documents and URLs into a dynamic, queryable knowledge graph. It uses RAG (Retrieval-Augmented Generation) combined with graph-based search to provide deep insights with high-fidelity source attribution.

## 🚀 Key Features

*   **Intelligent Ingestion**: Support for PDF, TXT, and Markdown files, plus direct URL scraping.
*   **Semantic Chat**: Query your data using natural language with source-attributed answers.
*   **Knowledge Graph Visualization**: interactive 2D graph explore entities (Persons, Organizations, Concepts, etc.) and their relationships extracted from your documents.
*   **Source Attribution**: Every AI response comes with clear semantic and graph-based source cards for transparency.
*   **Secure Auth**: Built-in authentication and protected routes.

## 🛠️ Tech Stack

*   **Core**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
*   **Graph Engine**: [React Flow](https://reactflow.dev/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **State Management**: React Hooks & Context API

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 18.x or later
- Access to the LexiGraph Backend API

### 2. Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Installation & Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

*   `/app` — Main application routes (Dashboard, Chat, Graph).
*   `/components` — Shared UI components and Auth providers.
*   `/lib` — Utility functions and shared logic.

## 🌐 Deployment

The project is configured for easy deployment on **Vercel**. Simply connect your repository and ensure the `NEXT_PUBLIC_API_URL` environment variable is set in your Vercel project dashboard.
