# VERIDEX

AI-powered corporate credit appraisal system for Indian lending.

## Features
- **Stage 1: Entity Onboarding**: Multi-step form with real-time CIN/PAN validation.
- **Stage 2: Intelligent Upload**: Drag-and-drop repository for 5 key corporate documents.
- **Stage 3: AI Extraction**: Automated classification and metric extraction using Claude 3.5 Sonnet.
- **Stage 4: Credit Report**: Secondary research analysis and professional PDF generation.

## Tech Stack
- **Backend**: Python FastAPI, PyMuPDF, ReportLab, Anthropic Claude.
- **Frontend**: React (Vite), Framer Motion, Lucide Icons, Vanilla CSS.

## Setup Instructions

### Backend
1. Navigate to `/backend`.
2. Create a virtual environment: `python -m venv venv`.
3. Activate it: `source venv/bin/activate` (or `venv\Scripts\activate` on Windows).
4. Install dependencies: `pip install -r requirements.txt`.
5. Create a `.env` file based on `.env.example` and add your `ANTHROPIC_API_KEY`.
6. Run the server: `python main.py`.

### Frontend
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Start the dev server: `npm run dev`.

## Deployment
- **Backend**: Deploy to Render.com using the included `render.yaml`.
- **Frontend**: Deploy to Vercel using the included `vercel.json` (update the API destination URL).
