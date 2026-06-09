# Intelligent PDF Reader using RAG

An AI-powered PDF Q&A app using **Groq (Llama 3.3 70B)** + **RAG** + **FAISS** + **React**.

---

## 🗂️ Project Structure

```
pdf-rag-app/
├── backend/
│   ├── main.py          # FastAPI server
│   ├── rag.py           # RAG engine (FAISS + Groq)
│   ├── requirements.txt
│   └── render.yaml      # Render deployment config
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── App.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## ⚙️ Local Setup

### Step 1 — Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file:
```
GROQ_API_KEY=your_groq_api_key_here
```

Run the server:
```bash
uvicorn main:app --reload --port 8000
```

Backend will be live at: `http://localhost:8000`

---

### Step 2 — Frontend

```bash
cd frontend
npm install
```

Create `.env` file:
```
VITE_API_URL=http://localhost:8000
```

Run the frontend:
```bash
npm run dev
```

Frontend will be live at: `http://localhost:5173`

---

## ☁️ Cloud Deployment (FREE)

### Backend → Render.com

1. GitHub pe push karo yeh project
2. [render.com](https://render.com) pe jaao → New Web Service
3. GitHub repo connect karo
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Environment Variables mein add karo:
   - `GROQ_API_KEY` = your key
6. Deploy karo! 🚀

Tumhare paas milega: `https://pdf-rag-backend.onrender.com`

---

### Frontend → Vercel.com

1. [vercel.com](https://vercel.com) pe jaao → New Project
2. GitHub repo connect karo
3. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
4. Environment Variables:
   - `VITE_API_URL` = `https://your-backend-url.onrender.com`
5. Deploy! 🚀

---

## 🔑 Groq API Key Kaise Milegi?

1. [console.groq.com](https://console.groq.com) pe jaao
2. Sign up karo (free)
3. API Keys → Create API Key
4. Copy karo aur `.env` mein paste karo

---

## ✨ Features

- 📄 PDF upload (drag & drop ya click)
- 💬 Chat interface
- 🔍 RAG-based accurate answers
- 📍 Source page numbers
- ⚡ Groq — super fast inference
- 🆓 100% Free stack

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| AI Model | Groq — Llama 3.3 70B |
| Embeddings | sentence-transformers (local) |
| Vector Store | FAISS |
| RAG Framework | LangChain |
| Backend | FastAPI |
| Frontend | React + Vite |
| Deployment | Render + Vercel |
