FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY app/ ./app/

# startCommand in railway.toml overrides this, but keep shell form as fallback
CMD python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
