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
EMBEDDINGS_CACHE = "embeddings_cache.mmap"

def build_database():
    if os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} already exists. Skipping initialization.")
        return

    conn = sqlite3.connect(DB_FILE)

    print("Connecting to Hugging Face dataset (Streaming mode)...")
    dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)
    
    phrases, topics, models, prompt_indices = [], [], [], []
    total_scanned = 0
    MAX_GLOBAL_LINES = 70_000_000 

    print("Extracting ALL factoids without any per-topic limitations...")
    for line in dataset['clusters']:
        total_scanned += 1
        if total_scanned % 500_000 == 0:
            print(f"Lines scanned: {total_scanned:,} | Extracted phrases: {len(phrases):,}", flush=True)

        topic_line = line.get('topic')
        phrase_line = line.get('factoid') 

        if not topic_line or not phrase_line:
            continue
        
        phrases.append(phrase_line)
        topics.append(topic_line)
        models.append(line.get('model_id'))
        prompt_indices.append(line.get('prompt_index'))
        
        if total_scanned >= MAX_GLOBAL_LINES:
            break

    n_points = len(phrases)
    print(f"Data extraction complete: {n_points:,} total phrases collected.", flush=True)

    # ------------------------------------------------------------------------
    # STEP 1: Batch-wise Embedding Computation (Memory-Mapped)
    # ------------------------------------------------------------------------
    print("Step 1/3: Computing high-dimensional sentence embeddings (Batch mode)...", flush=True)
    start_embed = time.time()
    
    # 1. Déterminer la dimension des embeddings sur une phrase test
    sample_emb = embed_sentences([phrases[0]])
    emb_dim = sample_emb.shape[1]
    
    # 2. Créer un fichier memmap sur disque pour éviter de faire exploser la RAM
    embeddings = np.memmap(EMBEDDINGS_CACHE, dtype='float32', mode='w+', shape=(n_points, emb_dim))
    
    # 3. Calculer par paquets de 50 000 phrases
    EMBED_BATCH_SIZE = 50_000
    for i in range(0, n_points, EMBED_BATCH_SIZE):
        batch_phrases = phrases[i:i + EMBED_BATCH_SIZE]
        batch_embs = embed_sentences(batch_phrases)
        embeddings[i:i + len(batch_phrases)] = batch_embs
        embeddings.flush()  # Écrit sur disque et libère la RAM
        
        if i > 0 and i % 500_000 == 0:
            print(f" -> Processed embeddings: {i:,} / {n_points:,}...", flush=True)

    print(f" -> Embeddings calculated in {time.time() - start_embed:.2f}s", flush=True)

    # ------------------------------------------------------------------------
    # STEP 2: 3D Dimension Reduction via openTSNE (Landmark-based Projection)
    # ------------------------------------------------------------------------
    print("Step 2/3: Generating 3D t-SNE coordinates using landmark projection...", flush=True)
    start_tsne = time.time()
    
    tsne = TSNE(
        n_components=3,
        perplexity=30,
        metric="cosine",
        n_jobs=-1,
        random_state=42
    )
    
    if n_points > 300_000:
        n_landmarks = min(200_000, n_points)
        print(f" -> Fitting base 3D t-SNE grid on {n_landmarks:,} landmark points...", flush=True)
        
        indices_landmarks = np.random.choice(n_points, size=n_landmarks, replace=False)
        
        # Charger uniquement le sous-ensemble de landmarks en RAM
        landmark_data = np.array(embeddings[indices_landmarks])
        embedding_landmarks = tsne.fit(landmark_data)
        del landmark_data  # Nettoyage RAM
        
        embeddings_3d = np.zeros((n_points, 3), dtype=np.float32)
        embeddings_3d[indices_landmarks] = embedding_landmarks
        
        mask_remaining = np.ones(n_points, dtype=bool)
        mask_remaining[indices_landmarks] = False
        remaining_indices = np.where(mask_remaining)[0]
        
        batch_size = 50_000
        for i in range(0, len(remaining_indices), batch_size):
            batch_idx = remaining_indices[i:i + batch_size]
            # Extraction par lot depuis le memmap
            batch_data = np.array(embeddings[batch_idx])
            embeddings_3d[batch_idx] = embedding_landmarks.transform(batch_data)
            
            if i > 0 and i % 1_000_000 == 0:
                print(f"    Projected {i:,} / {len(remaining_indices):,} points...", flush=True)
    else:
        embeddings_3d = tsne.fit(np.array(embeddings))

    print(f" -> 3D coordinates generated in {time.time() - start_tsne:.2f}s", flush=True)

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
    
    del embeddings_3d
    # Supprimer le fichier temporaire d'embeddings sur disque
    if os.path.exists(EMBEDDINGS_CACHE):
        os.remove(EMBEDDINGS_CACHE)

    print("Step 3/3: Performing local clustering using MiniBatchKMeans...", flush=True)
    computed_clusters = np.zeros(len(galaxy_df), dtype=int)
    
    for topic_name, group in galaxy_df.groupby('topic'):
        n_samples = len(group)
        n_clusters = max(3, min(20, n_samples // 50))
        
        if n_samples >= n_clusters:
            mbk = MiniBatchKMeans(n_clusters=n_clusters, random_state=42, batch_size=1024)
            computed_clusters[group.index] = mbk.fit_predict(galaxy_df.loc[group.index, ['x', 'y', 'z']].values)

    galaxy_df['cluster'] = computed_clusters
    galaxy_df['id'] = np.arange(len(galaxy_df))

    print("Writing records to SQLite database...", flush=True)
    galaxy_df.to_sql("galaxy_points", conn, if_exists="replace", index=False, chunksize=50_000)

    print("Creating performance indexes...", flush=True)
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_galaxy_id ON galaxy_points(id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_galaxy_topic ON galaxy_points(topic);")
    conn.commit()
    conn.close()
    
    print("Database build successfully completed!", flush=True)

if __name__ == "__main__":
    build_database()