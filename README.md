# ExamForge

A full-stack, AI-powered secure online examination platform with real-time proctoring, anti-cheating enforcement, and AI-powered answer evaluation and question extraction.

**Live Demo:** [[live link](https://examforge-peach.vercel.app/)]

---

## What Does It Do?

ExamForge lets teachers create and manage secure online exams, and students take them — with real-time webcam proctoring, anti-cheating enforcement, and AI-powered answer scoring. Admins can also upload images of question papers and have questions extracted automatically using AI.

---

## Features

### For Admins (Teachers)
- Create exams with title, subject, duration, and total marks
- Add questions manually or by uploading an image of a question paper (AI extracts questions automatically)
- Add model answers per question for AI scoring
- Finalize exam and generate a unique `EF-XXXXXX` code valid for 24 hours
- Share a one-click link that takes students directly to the exam
- View all student submissions with AI scores, violations, and answers
- Override AI scores manually per question
- Export results as CSV

### For Students
- Join exam via code or shareable link
- Pre-exam checklist (camera, microphone, single monitor, fullscreen, rules)
- Timed exam interface with auto-save every 10 seconds
- Digital whiteboard for rough work (not submitted)
- Backend timer — refreshing the page does not reset the timer

### Anti-Cheating

| Mechanism | Trigger |
|---|---|
| Fullscreen enforcement | Exiting fullscreen = violation |
| Tab / window switch | Any focus change = violation |
| Copy-paste prevention | Ctrl+C, Ctrl+V, right-click blocked |
| Back navigation trap | Browser back button = violation |
| Screenshot blur | PrintScreen blurs screen for 3 seconds |
| DevTools detection | Opening DevTools = violation |
| Face absence | 20 cumulative seconds without face = violation |
| Multiple faces | 2+ faces in camera = violation |
| Audio detection | Sustained speaking for 15s = violation |
| Auto-submit | After 3 violations, exam submits and is flagged |

### AI Features
- **Question extraction** — Upload an image of a question paper, Groq Vision extracts all questions automatically
- **Answer evaluation** — Groq API evaluates student descriptive answers against model answers semantically
- **Fallback** — TF-IDF cosine similarity if Groq API is unavailable

---

## Tech Stack

### Frontend
```
React 18 + Vite        UI framework
TailwindCSS            Styling
React Router v6        Routing
Zustand                Auth state with localStorage persistence
Axios                  API calls
face-api.js            Client-side face detection
react-hot-toast        Toast notifications
```

### Backend
```
Node.js 20 + Express   REST API server
Prisma ORM             Database queries and migrations
PostgreSQL (Neon)      Primary database
bcrypt                 Password hashing
jsonwebtoken           JWT authentication
Resend API             OTP email delivery
Passport.js            Google OAuth 2.0
express-rate-limit     Brute force protection
natural                TF-IDF fallback scoring
axios                  External API calls
Groq SDK               AI answer evaluation + question extraction
```

---

## Project Structure

```
examforge/
├── frontend/
│   ├── public/
│   │   └── models/                    <- face-api.js model files go here
│   └── src/
│       ├── api/
│       │   ├── axiosInstance.js
│       │   ├── authApi.js
│       │   ├── adminApi.js
│       │   └── studentApi.js
│       ├── components/
│       │   ├── Whiteboard.jsx
│       │   ├── WebcamPreview.jsx
│       │   ├── Timer.jsx
│       │   └── ViolationOverlay.jsx
│       ├── hooks/
│       │   └── useFaceDetection.js
│       ├── pages/
│       │   ├── Admin/
│       │   │   ├── AdminDashboard.jsx
│       │   │   ├── CreateExam.jsx
│       │   │   ├── ManageQuestions.jsx
│       │   │   └── ResultsDashboard.jsx
│       │   ├── Auth/
│       │   │   ├── LoginPage.jsx
│       │   │   ├── OTPPage.jsx
│       │   │   └── GoogleSuccess.jsx
│       │   └── Student/
│       │       ├── StudentDashboard.jsx
│       │       ├── PreExamChecklist.jsx
│       │       ├── ExamInterface.jsx
│       │       └── SubmittedScreen.jsx
│       └── store/
│           └── authStore.js
│
└── backend/
    ├── prisma/
    │   └── schema.prisma
    ├── server.js
    └── src/
        ├── app.js
        ├── config/
        │   └── passport.js
        ├── controllers/
        │   ├── authController.js
        │   └── adminController.js
        ├── middleware/
        │   ├── authMiddleware.js
        │   └── rateLimiter.js
        ├── routes/
        │   ├── authRoutes.js
        │   ├── adminRoutes.js
        │   └── studentRoutes.js
        ├── services/
        │   ├── emailService.js        <- Resend API OTP delivery
        │   ├── otpService.js
        │   ├── evaluationService.js   <- Groq AI + TF-IDF scoring
        │   └── examCodeService.js
        └── utils/
            ├── jwt.js
            ├── codeGen.js
            └── prismaClient.js
```

---

## Local Setup Guide

### Step 1 — Clone the Repository

```bash
git clone https://github.com/yourusername/examforge.git
cd examforge
```

---

### Step 2 — Backend Setup

```bash
cd backend
npm install
```

#### Packages installed:
```
express cors dotenv bcrypt jsonwebtoken
passport passport-google-oauth20
@prisma/client prisma express-rate-limit
axios natural groq-sdk resend
```

#### Create `backend/.env`

```env
# Server
PORT=5000

# Database — get free PostgreSQL from neon.tech
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/examforge?sslmode=require"

# JWT — generate with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_generated_secret_here
JWT_EXPIRES_IN=8h

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Resend API — get from resend.com (see Step 5)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx
SENDER_EMAIL=onboarding@resend.dev

# Google OAuth — get from console.cloud.google.com (see Step 6)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Groq API — get from console.groq.com (see Step 7)
# Used for AI answer evaluation
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxx

# Groq Extraction Key — used for image question extraction
GROQ_EXTRACTION_KEY=gsk_xxxxxxxxxxxxxxxxxx

# Brevo API key : used for sending otps via temporary email
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxx
```

> Note: `GROQ_API_KEY` and `GROQ_EXTRACTION_KEY` can be the same Groq API key. They are separated in the codebase so you can use different keys or rate limit them independently.

#### Run database migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

#### Start backend

```bash
npm run dev
# Server running on port 5000
```

---

### Step 3 — Frontend Setup

```bash
cd frontend
npm install
```

#### Packages installed:
```
react react-dom react-router-dom
axios zustand
tailwindcss postcss autoprefixer
face-api.js react-hot-toast
```

#### Create `frontend/.env`

```env
VITE_API_URL=http://localhost:5000
```

#### Start frontend

```bash
npm run dev
# Local: http://localhost:5173
```

---

### Step 4 — Face Detection Model Files

face-api.js requires 2 model files. Without them, face detection will not work.

1. Go to: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
2. Download these 2 files:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
3. Place both files in `frontend/public/models/`

```
frontend/public/models/
├── tiny_face_detector_model-weights_manifest.json
└── tiny_face_detector_model-shard1
```

---

### Step 5 — Resend API (for OTP emails)

1. Go to [resend.com](https://resend.com) and sign up free
2. From the dashboard, go to **API Keys** and create a new key
3. Copy the key and paste it as `RESEND_API_KEY` in `backend/.env`
4. For `SENDER_EMAIL`, use `onboarding@resend.dev` for testing, or verify your own domain for production

---

### Step 6 — Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project named `ExamForge`
3. Go to **APIs & Services → OAuth consent screen → External** → fill in app name and email
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID → Web application**
5. Under **Authorized JavaScript origins** add:
   ```
   http://localhost:5000
   http://localhost:5173
   ```
6. Under **Authorized redirect URIs** add:
   ```
   http://localhost:5000/api/auth/google/callback
   ```
7. Click **Create** — copy the Client ID and Client Secret into `backend/.env`

> To find the Client Secret later: go to Credentials → click the pencil icon on your OAuth client → scroll to Client secrets → click **Add Secret**.

---

### Step 7 — Groq API (for AI scoring and question extraction)

1. Go to [console.groq.com](https://console.groq.com) and sign up free
2. Go to **API Keys → Create API Key**
3. Copy the key (starts with `gsk_...`)
4. Paste the same key for both `GROQ_API_KEY` and `GROQ_EXTRACTION_KEY` in `backend/.env`

Groq free tier is generous — fast inference with no billing required for development.

---

## How to Use

### Admin workflow

1. Register with an `@iitr.ac.in` email — auto-assigned Admin role
2. Go to Admin Dashboard → click **+ New Exam**
3. Fill in exam details and click **Create Exam**
4. Add questions:
   - Manually: type question, model answer, and marks
   - Via image: upload a photo of a question paper — AI extracts all questions automatically
5. Click **Finalize & Generate Code** when ready
6. Copy the exam code or shareable link and send to students
7. After students submit, open **View Results** to see scores
8. Override any AI score manually, then export as CSV

### Student workflow

1. Register with any non-`@iitr.ac.in` email — auto-assigned Student role
2. Enter the exam code on the Student Dashboard (or click the shareable link)
3. Complete the pre-exam checklist:
   - Click **Grant Access** for camera and microphone
   - Confirm single monitor
   - Click **Enable Fullscreen**
   - Read and accept exam rules
4. Click **Start Exam**
5. Answer all questions — answers save automatically
6. Use the **Whiteboard** toggle for rough work
7. Click **Submit Exam** when done

---

## Deployment

### Frontend — Vercel

1. Push `frontend/` to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Framework: **Vite**
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
5. Deploy

### Backend — Render

1. Push `backend/` to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect repo
3. Build command:
   ```
   npm install && npx prisma migrate deploy && npx prisma generate
   ```
4. Start command:
   ```
   node server.js
   ```
5. Add all `.env` variables in the Environment tab
6. Update these for production:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/api/auth/google/callback
   ```

### Update Google OAuth for production

Add to Authorized JavaScript origins:
```
https://your-app.vercel.app
https://your-backend.onrender.com
```

Add to Authorized redirect URIs:
```
https://your-backend.onrender.com/api/auth/google/callback
```

### Keep backend warm

Render free tier sleeps after 15 minutes of inactivity. Use [cron-job.org](https://cron-job.org) to ping your backend every 14 minutes:
```
https://your-backend.onrender.com/health
```

---

## Role Detection

| Email Domain | Role | Dashboard |
|---|---|---|
| `@iitr.ac.in` | Admin | Exam management |
| Any other domain | Student | Exam portal |

To change the admin email domain, edit `backend/src/controllers/authController.js`:

```javascript
const role = email.endsWith('@iitr.ac.in') ? 'admin' : 'student';
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string from Neon |
| `JWT_SECRET` | Yes | Random 64-char secret for JWT signing |
| `JWT_EXPIRES_IN` | Yes | Token expiry duration (e.g. `8h`) |
| `FRONTEND_URL` | Yes | Frontend origin for CORS and redirects |
| `RESEND_API_KEY` | Yes | Resend API key for OTP email delivery |
| `SENDER_EMAIL` | Yes | Verified sender email address |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | Google OAuth redirect URL |
| `GROQ_API_KEY` | Yes | Groq API key for AI answer evaluation |
| `GROQ_EXTRACTION_KEY` | Yes | Groq API key for image question extraction |
| `BREVO_API_KEY` | Yes | Brevo api key will be used for emailing otps through temporary emails |


---

## Database Schema

| Table | Purpose |
|---|---|
| `User` | All users with role and auth provider |
| `Exam` | Exam metadata — title, subject, duration, status |
| `ExamCode` | Generated codes with 24hr expiry |
| `Question` | Questions with model answers and marks |
| `Submission` | Student exam sessions with status and violation count |
| `Answer` | Student answers with AI scores and admin override scores |
| `Violation` | Timestamped log of every violation event |
| `Otp` | Hashed OTPs with 10-minute expiry |

---

## Known Limitations

- Screenshot prevention is CSS-based — a deterrent, not a guaranteed block
- Multiple monitor detection uses `screen.isExtended` — Chrome 100+ and Edge 100+ only, not supported in Firefox
- Face detection accuracy varies with lighting and camera quality
- Groq free tier has rate limits — TF-IDF fallback activates automatically if the API is unavailable
- Render free tier has cold starts — use cron-job.org to keep the backend warm

---

## License

MIT License — free to use, modify, and distribute with attribution.

---

## Author

Built solo as a final project submission.

> ExamForge — because trust should be built in, not bolted on.
