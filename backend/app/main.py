from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

# 1. On importe d'abord le script de génération
from init_db import build_database

# 2. On s'assure que la base existe (ou est générée/re-générée) AVANT d'importer le repo
print("🚀 [Startup] Vérification de la base de données...")
build_database()
print("✅ [Startup] Base de données prête !")

# 3. Maintenant on peut importer et charger le repo en toute sécurité
from app.repositories.data_repository import DataRepository

app = FastAPI(
    title="Galaxy Explorer API",
    description="API to load and filter the 3D galaxy of LLM knowledge clusters. Built with FastAPI and Hugging Face Datasets.",
    version="1.0.0"
)

# 🌐 CORS activation on the Back-End
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🌌 Loading the galaxy with data...")
repo = DataRepository()
print("✅ Galaxy ready to be explored !")

# --- Tes routes restent exactement les mêmes ---

@app.get("/")
def read_root():
    return {"status": "online", "message": " API Galaxy Explorer on and ready to be used 🚀"}

@app.get("/api/meta")
def get_metadata():
    return repo.get_metadata_options()

@app.get("/api/points")
def get_points(
    models: Optional[List[str]] = Query(None, alias="models[]"),
    topics: Optional[List[str]] = Query(None, alias="topics[]"),
    settings: Optional[List[str]] = Query(None, alias="settings[]")
):
    return repo.get_filtered_points(selected_models=models, selected_topics=topics, selected_settings=settings)

@app.get("/api/points/{point_id}/details")
def get_point_details(point_id: int):
    details = repo.get_point_details(point_id)
    if "error" in details:
        raise HTTPException(status_code = 404, detail=details["error"])
    return details 

@app.get("/api/points/{point_id}/source-text")
def get_point_source_text(point_id: int):
    source_data = repo.get_points_source_text(point_id)
    if "error" in source_data:
        raise HTTPException(status_code=404, detail=source_data["error"])
    return source_data