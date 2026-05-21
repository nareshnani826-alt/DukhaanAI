FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY app/ ./app/

# Shell form — Docker passes this to /bin/sh so $PORT is expanded by the shell
CMD python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
