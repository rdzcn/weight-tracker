FROM python:3.12-slim

WORKDIR /app

# Install Tesseract OCR for image processing
RUN apt-get update && apt-get install -y \
	tesseract-ocr \
	&& rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
