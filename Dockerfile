# Stage 1: Build React Frontend
FROM node:18-alpine as frontend_build
WORKDIR /app/web
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 2: Python Backend & Runtime
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PYTHONPATH=/app

# Copy Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY src/ ./src/
COPY db/ ./db/
COPY directives/ ./directives/

# Copy Frontend Build from Stage 1
COPY --from=frontend_build /app/web/dist ./web/dist

# Expose Port
ENV PORT=8000
EXPOSE $PORT

# Start Command
CMD ["python", "src/main.py"]
