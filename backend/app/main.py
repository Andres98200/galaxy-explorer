import torch

if not torch.cuda.is_available():
    torch.cuda.current_device = lambda: 0
    torch.cuda.device_count = lambda: 0


from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from init_db import build_database

print("🚀 [Startup] Checking if the database already exists...")
build_database()
print("✅ [Startup] Database is ready !")

from app.repositories.data_repository import DataRepository

app = FastAPI(
    title="AXECOM API",
    description="API to load and filter the 3D galaxy of LLM knowledge clusters. Built with FastAPI and Hugging Face Datasets.",
    version="4.0.0"
)

# CORS activation on the Back-End
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading the galaxy with data...")
repo = DataRepository()
print("Galaxy ready to be explored ")

@app.get("/")
def read_root():
    return {"status": "online", "message": " API Galaxy Explorer on and ready to be used "}

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

@app.get("/api/diversity-overview")
def get_diversity_overview(
    models: Optional[List[str]] = Query(None),
    topics: Optional[List[str]] = Query(None),
    settings: Optional[List[str]] = Query(None)
):
    """
    Endpoint for the diversity overview metrics.
    """
    return repo.get_diversity_overview(
        selected_models=models,
        selected_topics=topics,
        selected_settings=settings
    )

@app.get('/api/diversity-matrix')
def get_diversity_matrix():
    """
    Endpoint for the diversity explorer modal
    """
    return repo.get_diversity_matrix()