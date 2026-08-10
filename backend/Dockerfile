FROM python:3.10-slim

WORKDIR /app

# 1. Installation of git (for cloning repositories)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# 2. baisc dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm

# 4. NLTK dependencie
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab')"

# 5. copie the backend code
COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]