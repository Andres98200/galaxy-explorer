import os
import time
import sqlite3
import pandas as pd
import numpy as np
import torch
from datasets import load_dataset
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from llm_knowledge.epistemic_diversity import embed_sentences

if not torch.cuda.is_available():
    torch.cuda.current_device = lambda: 0
    torch.cuda.device_count = lambda: 0

DB_FILE = os.path.join("data", "galaxy_explorer.db")

def build_database():
    os.makedirs("data", exist_ok=True)
    
    if os.path.exists(DB_FILE):
        try:
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM galaxy_points")
            count = cursor.fetchone()[0]
            conn.close()
            if count > 0:
                print(f"✅ Database {DB_FILE} already exists and contains {count} points.")
                return
        except Exception as e:
            print(f"⚠️ Existing database invalid ({e}). Rebuilding...")
            os.remove(DB_FILE)

    print("Database not found. Launching automated generation...")
    global_start = time.time()
    conn = sqlite3.connect(DB_FILE)

    # -------------------------------------------------------------
    # 1. Scanning streaming des clusters
    # -------------------------------------------------------------
    print("Connection to Hugging Face (Streaming mode)...")
    dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)
    
    phrases, topics, models, prompt_indices, settings = [], [], [], [], []
    count_data = {}
    MAX_PHRASES_PER_TOPIC = 50
    total_scanned = 0
    MAX_LINES_TO_SCAN = 100000

    print("Beginning scan of dataset lines...")
    for line in dataset['clusters']:
        total_scanned += 1
        
        if total_scanned % 50000 == 0:
            print(f"Lines scanned : {total_scanned:,} | Points retained : {len(phrases):,}")

        topic_line = line.get('topic')
        phrase_line = line.get('factoid')

        if not topic_line or not phrase_line:
            continue
        
        topic_clean = str(topic_line).strip().lower()
        
        if topic_clean not in count_data:
            count_data[topic_clean] = 0
        
        if count_data[topic_clean] < MAX_PHRASES_PER_TOPIC:
            phrases.append(phrase_line)
            topics.append(topic_clean)
            models.append(str(line.get('model_id', line.get('model', 'unknown'))).strip().lower())
            prompt_indices.append(int(line.get('prompt_index', 0)))
            settings.append(str(line.get('setting', 'default')).strip().lower())
            count_data[topic_clean] += 1
        
        if total_scanned >= MAX_LINES_TO_SCAN:
            break

    print(f"Scan terminated! {total_scanned:,} lines scanned in total.")
    print(f"Final number of points retained for the 3D galaxy : {len(phrases):,}")

    # -------------------------------------------------------------
    # 2. Embeddings GPU & t-SNE 3D
    # -------------------------------------------------------------
    print("Step 1/3 : Calculate embeddings...")
    start_embed = time.time()
    embeddings = embed_sentences(phrases)
    print(f"  -> Embeddings calculated successfully in {time.time() - start_embed:.2f} seconds.")

    print("Step 2/3 : Calculating t-SNE 3D (Positioning the points)...")
    start_tsne = time.time()
    perplexity = min(30, max(5, len(embeddings) // 100))
    
    tsne_3d = TSNE(
        n_components=3,
        perplexity=perplexity,
        n_jobs=-1, 
        random_state=42,
        init="pca",
        learning_rate="auto"
    )
    embeddings_3d = tsne_3d.fit_transform(embeddings)
    print(f"  -> 3D coordinates generated in {time.time() - start_tsne:.2f} seconds.")

    # -------------------------------------------------------------
    # 3. Clustering KMeans local par Topic
    # -------------------------------------------------------------
    print("Step 3/3 : Generating coherent local clusters by topic...")
    galaxy_df = pd.DataFrame({
        'id': range(len(phrases)),
        'phrase': phrases,
        'topic': topics,
        'model': models,
        'prompt_index': prompt_indices,
        'setting': settings,
        'x': embeddings_3d[:, 0],
        'y': embeddings_3d[:, 1],
        'z': embeddings_3d[:, 2]
    })

    computed_clusters = np.zeros(len(galaxy_df), dtype=int)
    for topic_name, group in galaxy_df.groupby('topic'):
        n_samples = len(group)
        n_clusters = max(3, min(10, n_samples // 15))
        
        if n_samples >= n_clusters:
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=5)
            labels = kmeans.fit_predict(embeddings[group.index])
            computed_clusters[group.index] = labels

    galaxy_df['cluster'] = computed_clusters

    print("Saving 3D points in SQLite...")
    galaxy_df.to_sql("galaxy_points", conn, if_exists="replace", index=False)
    
    del embeddings, embeddings_3d, phrases, galaxy_df

    cursor = conn.cursor()
    cursor.execute("CREATE INDEX idx_galaxy_lookup ON galaxy_points(topic, prompt_index, model);")
    cursor.execute("CREATE INDEX idx_galaxy_id ON galaxy_points(id);")
    cursor.execute("CREATE INDEX idx_galaxy_setting ON galaxy_points(setting);")
    cursor.execute("CREATE INDEX idx_galaxy_topic ON galaxy_points(topic);")
    cursor.execute("CREATE INDEX idx_galaxy_model ON galaxy_points(model);")
    conn.commit()

    # -------------------------------------------------------------
    # 4. Streaming & Insertion par lots de full_responses
    # -------------------------------------------------------------
    print("Streaming full_responses and inserting directly into SQLite...")
    responses_ds = load_dataset('dwright37/llm-knowledge-collapse', 'full_responses', split='full_responses', streaming=True)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS responses (
            topic TEXT,
            prompt_index INTEGER,
            model_id TEXT,
            setting TEXT,
            user_prompt TEXT,
            text TEXT
        )
    """)
    
    batch = []
    BATCH_SIZE = 10000
    
    for row in responses_ds:
        prompt_text = row.get('user_prompt') or row.get('prompt') or row.get('instruction') or ''
        batch.append((
            str(row.get('topic', '')).strip().lower(),
            int(row.get('prompt_index', 0)),
            str(row.get('model_id', row.get('model', ''))).strip().lower(),
            str(row.get('setting', 'default')).strip().lower(),
            str(prompt_text),
            str(row.get('text', ''))
        ))
        
        if len(batch) >= BATCH_SIZE:
            cursor.executemany("INSERT INTO responses VALUES (?, ?, ?, ?, ?, ?)", batch)
            conn.commit()
            batch.clear()

    if batch:
        cursor.executemany("INSERT INTO responses VALUES (?, ?, ?, ?, ?, ?)", batch)
        conn.commit()

    print(" lookup indexes on responses...")
    cursor.execute("CREATE INDEX idx_responses_lookup ON responses(topic, prompt_index, model_id, setting);")
    conn.commit()
    conn.close()
    print(f"🎉 Database successfully created in {time.time() - global_start:.2f} seconds!")

if __name__ == "__main__":
    build_database()