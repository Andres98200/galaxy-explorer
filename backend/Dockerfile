FROM python:3.10-slim

WORKDIR /app

# 1. Installer Git (nécessaire pour que pip clonât le dépôt)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# 2. Dépendances de base
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm

# 4. Téléchargement NLTK
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab')"

# 5. Copie du code backend
COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]