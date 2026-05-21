# ✦ SketchMind — AI Text-to-Drawing Platform

> Turn your words into AI-generated drawings. Built with React + Python FastAPI + Stable Diffusion.

## Quick Start

### 1. Clone & configure
```bash
git clone https://github.com/youruser/sketchmind.git
cd sketchmind
cp backend/.env.example backend/.env
# Fill in SMTP credentials and at least one AI key in backend/.env
```

### 2. Run with Docker Compose (recommended)
```bash
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 3. Run locally (development)
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install && npm start
```

## Environment Variables (backend/.env)
| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | JWT signing secret (random 64 chars) |
| `SMTP_USER` | For email | Gmail address |
| `SMTP_PASS` | For email | Gmail App Password (not your login password) |
| `OPENAI_API_KEY` | For DALL-E | OpenAI API key |
| `HF_TOKEN` | For SD | Hugging Face token |

> Without API keys, the app works in **dev mode** — OTPs print to terminal, images are placeholders.

## Project Structure
```
sketchmind/
├── frontend/                 React app
│   ├── src/
│   │   ├── pages/            AuthPage, DrawPage, GalleryPage
│   │   ├── components/       Navbar, Button, Toast, OTPInput, etc.
│   │   ├── hooks/            useToast, useGallery, useTimer
│   │   └── utils/api.js      Axios wrapper
│   └── Dockerfile
├── backend/
│   ├── main.py               FastAPI (auth + /generate)
│   ├── requirements.txt
│   └── Dockerfile
├── k8s/                      Kubernetes manifests
├── .github/workflows/        CI (ci.yml) + CD (cd.yml)
├── Jenkinsfile               Jenkins alternative pipeline
└── docker-compose.yml
```

## Deployment
- **Dev:** `docker compose up`
- **Kubernetes (local):** `minikube start && kubectl apply -f k8s/`
- **Production:** Push to `main` → GitHub Actions builds and deploys automatically
