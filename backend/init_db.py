import os
import time
import sqlite3
import numpy as np
import pandas as pd
import torch
from datasets import load_dataset
from sklearn.cluster import MiniBatchKMeans
from openTSNE import TSNE
from llm_knowledge.epistemic_diversity import embed_sentences

# Ensure CUDA device handling doesn't break if GPU isn't directly available
if not torch.cuda.is_available():
    torch.cuda.current_device = lambda: 0
    torch.cuda.device_count = lambda: 0

DB_FILE = "galaxy_explorer.db"

def build_database():
    if os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} already exists. Skipping initialization.")
        return

    conn = sqlite3.connect(DB_FILE)

    print("Connecting to Hugging Face dataset (Streaming mode)...")
    dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)
    
    phrases, topics, models, prompt_indices = [], [], [], []
    total_scanned = 0
    
    # Set the total dataset scan limit (e.g., 70M lines or full dataset)
    # No per-topic restriction is applied here.
    MAX_GLOBAL_LINES = 70_000_000 

    print("Extracting ALL factoids without any per-topic limitations...")
    for line in dataset['clusters']:
        total_scanned += 1
        if total_scanned % 500_000 == 0:
            print(f"Lines scanned: {total_scanned:,} | Extracted phrases: {len(phrases):,}")

        topic_line = line.get('topic')
        phrase_line = line.get('factoid') 

        if not topic_line or not phrase_line:
            continue
        
        # Collect every valid entry without capping by topic
        phrases.append(phrase_line)
        topics.append(topic_line)
        models.append(line.get('model_id'))
        prompt_indices.append(line.get('prompt_index'))
        
        if total_scanned >= MAX_GLOBAL_LINES:
            break

    n_points = len(phrases)
    print(f"Data extraction complete: {n_points:,} total phrases collected.")

    # ------------------------------------------------------------------------
    # STEP 1: Calculate Sentence Embeddings
    # ------------------------------------------------------------------------
    print("Step 1/3: Computing high-dimensional sentence embeddings...")
    start_embed = time.time()
    embeddings = embed_sentences(phrases)
    print(f" -> Embeddings calculated in {time.time() - start_embed:.2f}s")

    # ------------------------------------------------------------------------
    # STEP 2: 3D Dimension Reduction via openTSNE (Landmark-based Projection)
    # Prevents Out-Of-Memory (OOM) crashes on large datasets (up to 70M points)
    # ------------------------------------------------------------------------
    print("Step 2/3: Generating 3D t-SNE coordinates using landmark projection...")
    start_tsne = time.time()
    
    # Initialize openTSNE with Fast Fourier Transform (FFT) acceleration
    tsne = TSNE(
        n_components=3,
        perplexity=30,
        metric="cosine",
        n_jobs=-1,  # Utilize all available CPU cores
        random_state=42
    )
    
    # Use landmark projection if dataset exceeds 300,000 points to keep RAM usage low
    if n_points > 300_000:
        # Select 200,000 landmark points to represent the overall semantic space
        n_landmarks = min(200_000, n_points)
        print(f" -> Fitting base 3D t-SNE grid on {n_landmarks:,} landmark points...")
        
        indices_landmarks = np.random.choice(n_points, size=n_landmarks, replace=False)
        embedding_landmarks = tsne.fit(embeddings[indices_landmarks])
        
        # Pre-allocate output array for 3D coordinates
        embeddings_3d = np.zeros((n_points, 3), dtype=np.float32)
        embeddings_3d[indices_landmarks] = embedding_landmarks
        
        # Project remaining millions of points into the fitted 3D space in chunks
        print(" -> Projecting remaining data points into the 3D space in batches...")
        mask_remaining = np.ones(n_points, dtype=bool)
        mask_remaining[indices_landmarks] = False
        remaining_indices = np.where(mask_remaining)[0]
        
        batch_size = 50_000
        for i in range(0, len(remaining_indices), batch_size):
            batch_idx = remaining_indices[i:i + batch_size]
            embeddings_3d[batch_idx] = embedding_landmarks.transform(embeddings[batch_idx])
            
            if i > 0 and i % 1_000_000 == 0:
                print(f"    Projected {i:,} / {len(remaining_indices):,} points...")
    else:
        # Direct fit for smaller datasets
        embeddings_3d = tsne.fit(embeddings)

    print(f" -> 3D coordinates generated in {time.time() - start_tsne:.2f}s")

    # ------------------------------------------------------------------------
    # STEP 3: DataFrame Construction & SQLite Indexing
    # ------------------------------------------------------------------------
    galaxy_df = pd.DataFrame({
        'phrase': phrases,
        'topic': topics,
        'model': models,
        'prompt_index': prompt_indices,
        'x': embeddings_3d[:, 0],
        'y': embeddings_3d[:, 1],
        'z': embeddings_3d[:, 2]
    })
    
    # Free up memory immediately
    del embeddings 
    del embeddings_3d

    print("Step 3/3: Performing local clustering using MiniBatchKMeans...")
    computed_clusters = np.zeros(len(galaxy_df), dtype=int)
    
    # Compute local clusters per topic to maintain local grouping structure
    for topic_name, group in galaxy_df.groupby('topic'):
        n_samples = len(group)
        # Dynamically scale number of clusters based on topic size
        n_clusters = max(3, min(20, n_samples // 50))
        
        if n_samples >= n_clusters:
            mbk = MiniBatchKMeans(n_clusters=n_clusters, random_state=42, batch_size=1024)
            computed_clusters[group.index] = mbk.fit_predict(galaxy_df.loc[group.index, ['x', 'y', 'z']].values)

    galaxy_df['cluster'] = computed_clusters
    galaxy_df['id'] = np.arange(len(galaxy_df))

    print("Writing records to SQLite database...")
    galaxy_df.to_sql("galaxy_points", conn, if_exists="replace", index=False, chunksize=50_000)

    # Create indexes to ensure fast HTTP response times in Uvicorn / FastAPI
    print("Creating performance indexes...")
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_galaxy_id ON galaxy_points(id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_galaxy_topic ON galaxy_points(topic);")
    conn.commit()
    conn.close()
    
    print("Database build successfully completed!")

if __name__ == "__main__":
    build_database()