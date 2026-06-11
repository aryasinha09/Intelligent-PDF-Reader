# 📄 Intelligent PDF Reader

An AI-powered PDF Q&A application built with RAG (Retrieval-Augmented Generation).

🌐 **Live App:** [intelligent-pdf-reader.vercel.app](https://intelligent-pdf-reader.vercel.app)

---

## ✨ Features

- 📄 Upload any PDF and chat with it
- 🔍 RAG-powered accurate answers
- 🔐 Email authentication
- 💾 Chat history saved to database
- 📦 Archive & delete sessions
- 📥 Export chat as PDF
- 🎨 Beautiful dark UI

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI + Python |
| AI Model | Groq (Llama 3.3 70B) |
| Embeddings | Sentence Transformers |
| Vector Store | ChromaDB |
| RAG Framework | LangChain |
| Authentication | Supabase Auth |
| Database | Supabase (PostgreSQL) |
| Backend Deploy | Hugging Face Spaces |
| Frontend Deploy | Vercel |

---

## 🚀 How it Works

1. Upload a PDF
2. RAG engine chunks and embeds the document
3. Ask any question
4. Relevant chunks are retrieved and sent to Groq AI
5. Get accurate answers based on your PDF!

---

## 🔧 Local Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env with GROQ_API_KEY=your_key
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
# Create .env.local with Supabase + API URL
npm run dev
```

### Screenshots

<img width="1920" height="1080" alt="Screenshot 2026-06-11 082834" src="https://github.com/user-attachments/assets/31e01779-5bf6-46f3-86dd-e3939b91ad7f" />



