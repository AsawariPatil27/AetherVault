AetherVault
A high-performance RAG platform featuring Hybrid Search, Automated ETL Pipelines, and Persistent Memory.

🚀 Key Features
Intelligent ETL Pipeline: Automated document ingestion using IBM Docling, converting complex PDFs into layout-aware Markdown.

Hybrid Search Engine: Combines Vector Similarity (semantic meaning) with Full-Text Search (keyword accuracy) using MongoDB Atlas.

Persistent Chat Memory: Implemented Upstash Redis to maintain sub-millisecond session state and context-aware dialogue.

Enterprise Security: Secure document access using Clerk authentication and Row-Level Security (RLS) via Supabase.

Source Citations: AI responses are grounded with direct links to source documents and page numbers to eliminate hallucinations.

🛠 Architecture Diagram (ETL Process)
User Upload ⮕ Supabase (Cloud Storage) ⮕ Node.js (Docling Parsing) ⮕ Embedding (HuggingFace) ⮕ MongoDB Atlas (Vector Store)

Proper Folder Structure
aethervault/
├── apps/
│   ├── web/                # Next.js Frontend
│   │   ├── components/     # UI: ChatWindow, FileGrid, Citations
│   │   ├── app/api/        # Next.js Route Handlers (Edge functions)
│   │   └── hooks/          # useChat, useFileUpload
│   └── api/                # Express.js / Node.js Backend (The Heavy Lifter)
│       ├── controllers/    # ETL Logic, Hybrid Search Logic
│       ├── services/       # AI Service (Groq), Storage Service (Supabase)
│       ├── models/         # MongoDB Schemas (Document, Session)
│       └── utils/          # Redis Connection, PDF Chunker
├── packages/               # Shared logic (if using monorepo)
└── .env                    # API Keys (GROQ_KEY, CLERK_SECRET, MONGODB_URI)

Implementation Steps
Phase 1: Setup & Storage (The "Upload")
Auth: Connect Clerk to your Next.js app. This handles the user's "Private Library."

Storage: Create a bucket in Supabase. When a user uploads a PDF, send it directly to Supabase. Store the returned file_url in MongoDB.

Phase 2: The ETL Pipeline (The "Intelligence")
Parsing: Send the PDF URL to your backend. Use Docling to extract text. Docling is better than old parsers because it recognizes tables and headers.

Embedding: Break text into chunks. Use a free embedding model (like BGE-M3) via HuggingFace's API.

Indexing: Save the text + vector + metadata (userId, fileName, page#) in MongoDB Atlas Vector Search.

Phase 3: Hybrid Retrieval (The "Wow Factor")
Write a MongoDB Aggregation Pipeline that uses $vectorSearch alongside $search (Full-Text).

Use Reciprocal Rank Fusion (RRF) to merge the results. This ensures that if a user searches for a specific "ID Number," the keyword search finds it, and if they ask a general question, the vector search finds it.

Phase 4: Memory & Generation
Chat History: Before calling the LLM, fetch the last 5 messages from Upstash Redis. It's much faster than querying MongoDB every single time for history.

Groq Call: Send the retrieved chunks + Chat History + User Question to Groq.

Frontend: Use the Vercel AI SDK to stream the response so it looks professional.
