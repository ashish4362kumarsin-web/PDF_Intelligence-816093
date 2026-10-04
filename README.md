# PDF Intelligence

PDF Intelligence is a document workspace for securely storing PDFs, extracting structured data, and using Gemini to answer questions, generate notes, and create mind maps from uploaded document content.

## Tech stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Python + FastAPI + Pydantic
- AI: Google Gemini API
- Data: Firebase Authentication, Firestore, Storage
- Security: environment variables, authenticated ownership rules, validated API responses

## Architecture

- Frontend app in `frontend/`
- FastAPI backend in `backend/`
- Firebase rules in `firebase/`
- Environment variable names and examples in the root `.env.example`

## Local setup

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment variables

Use the placeholders in the root `.env.example` and the server-only `backend/.env.example` files as the canonical templates.

- Create `frontend/.env.local` for public Firebase web config values.
- Create `backend/.env` for server-only Firebase Admin + Gemini settings.
- Keep all private keys and secrets in local environment files; do not commit them to Git.

Frontend variables:

- `VITE_API_BASE_URL`: backend API URL such as `http://localhost:8000/api`
- `VITE_FIREBASE_*`: values from Firebase Console → Project settings → General → Your web app

Backend variables:

- `GEMINI_API_KEY`: Google AI Studio / Gemini API key
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_STORAGE_BUCKET`: Firebase Storage bucket name
- `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`: Firebase Admin service account credentials
- `ALLOWED_ORIGINS`: comma-separated origins for CORS, such as `http://localhost:5173`
- `APP_ENV`, `LOG_LEVEL`, and `MAX_UPLOAD_SIZE_MB`: runtime settings

Never expose Firebase Admin credentials or the Gemini API key in browser code or frontend env files.

## Firebase setup

1. Create or select a Firebase project.
2. Enable Authentication and turn on Email/Password sign-in.
3. Enable Firestore and Storage in the project.
4. Add the Firebase web app config to `frontend/.env.local`.
5. Generate a service account and copy the private key + client email into `backend/.env`.
6. Set the `FIREBASE_STORAGE_BUCKET` to your project’s storage bucket.
7. Deploy the storage and Firestore rules in `firebase/`.

## Gemini setup

1. Create a Google AI Studio or Gemini API key.
2. Store it in `backend/.env` as `GEMINI_API_KEY`.
3. Ensure all AI calls happen in the backend FastAPI app, not in the browser.
4. Validate quota, rate limits, and response formatting before production use.

## Security notes

- Never expose secret keys in frontend code.
- Validate file types and sizes before upload.
- Check authenticated user ownership on every private resource.
- Validate external AI responses before rendering to users.

## Development commands

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set PYTHONPATH=.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm run build
npm run preview -- --host 0.0.0.0
```

### 3. Backend Unit Tests

```bash
cd backend
python -m unittest discover -s tests
```

## Deployment guidance

- Deploy frontend to a static host such as Vercel or Netlify.
- Deploy backend to a secure Python hosting provider or serverless Python runtime.
- Configure CORS, Firebase credentials, and environment variables in deployment settings.
- Set production security rules for Firestore and Storage.

## Troubleshooting

- Missing environment variables: check `frontend/.env.local` and `backend/.env`, then restart both servers.
- Firebase auth issues: ensure auth domain and project ID match the Firebase project.
- AI failures: validate the Gemini API key, quota, and response format.
- PDF errors: confirm file type is PDF and the upload size stays within the limit.
