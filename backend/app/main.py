from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from app.repositories.data_repository import DataRepository

app = FastAPI(
    title="Galaxy Explorer API",
    description="API to load and filter the 3D galaxy of LLM knowledge clusters. Built with FastAPI and Hugging Face Datasets.",
    version="1.0.0"
)

# 🌐 CORS activation on the Back-End
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # * to allow all origins, or specify your frontend URL(s) here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialisation of the data repository and loading the galaxy data
print("🌌 Loading the galaxy with data...")
repo = DataRepository()
print("✅ Galaxy ready to be explored !")

@app.get("/")
def read_root():
    return {"status": "online", "message": " API Galaxy Explorer on and ready to be used 🚀"}

@app.get("/api/meta")
def get_metadata():
    """Liste of available models and topics for filtering the galaxy"""
    return repo.get_metadata_options()

@app.get("/api/points")
def get_points(
    models: Optional[List[str]] = Query(None, alias="models[]"),
    topics: Optional[List[str]] = Query(None, alias="topics[]")
):
    """Returns the filtered 3D points"""
    return repo.get_filtered_points(selected_models=models, selected_topics=topics)