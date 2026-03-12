# VERIDEX Backend

AI-powered corporate credit appraisal system.

## Environment Setup

To resolve import issues and set up a local development environment:

1. **Create Virtual Environment**:
   ```bash
   python -m venv venv
   ```

2. **Activate Environment**:
   - Windows: `.\venv\Scripts\activate`
   - Unix/macOS: `source venv/bin/activate`

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your `ANTHROPIC_API_KEY`.

5. **Run Server**:
   ```bash
   python main.py
   ```
