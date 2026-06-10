from dotenv import load_dotenv
load_dotenv()

import os
from groq import Groq
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

class RAGEngine:
    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        self.vector_stores = {}
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

    def process_pdf(self, pdf_path: str, session_id: str) -> int:
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()
        chunks = self.text_splitter.split_documents(documents)
        vector_store = Chroma.from_documents(
            chunks,
            self.embeddings,
            collection_name=session_id
        )
        self.vector_stores[session_id] = vector_store
        return len(chunks)

    def has_session(self, session_id: str) -> bool:
        return session_id in self.vector_stores

    def clear_session(self, session_id: str):
        if session_id in self.vector_stores:
            del self.vector_stores[session_id]

    def answer_question(self, question: str, session_id: str) -> dict:
        vector_store = self.vector_stores[session_id]
        docs = vector_store.similarity_search(question, k=4)
        context = "\n\n---\n\n".join([doc.page_content for doc in docs])
        sources = list(set([
            f"Page {doc.metadata.get('page', 'N/A') + 1}"
            for doc in docs
        ]))

        prompt = f"""You are an intelligent PDF assistant. Answer the user's question based ONLY on the provided PDF context.
                 If the answer is not in the context, say "This information is not available in the uploaded PDF."
                Be clear, concise, and helpful.

PDF Context:
{context}

Question: {question}

Answer:"""

        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1024
        )

        return {
            "answer": response.choices[0].message.content,
            "sources": sources
        }