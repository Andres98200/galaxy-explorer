import os
import time
import sqlite3
from datasets import load_dataset
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from llm_knowledge.epistemic_diversity import embed_sentences
import pandas as pd
import numpy as np
import torch


if not torch.cuda.is_available():
    torch.cuda.current_device = lambda: 0
    torch.cuda.device_count = lambda: 0

DB_FILE = os.path.join("data", "galaxy_explorer.db")

def build_database():
    # Vérification robuste : on s'assure que le fichier ET la table existent
    if os.path.exists(DB_FILE):
        try:
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM galaxy_points")
            count = cursor.fetchone()[0]
            conn.close()
            if count > 0:
                print(f"✅ Database {DB_FILE} already exists and contains {count} points. No need to rebuild it.")
                return
        except Exception as e:
            print(f"⚠️ Existing database is invalid or empty ({e}). Rebuilding...")
            if os.path.exists(DB_FILE):
                os.remove(DB_FILE)

    print("🚀 Database not found or incomplete. Launching automated generation...")
    # ... suite du code de build_database()
    global_start = time.time()
    conn = sqlite3.connect(DB_FILE)

    print("Connection to Hugging Face (Streaming mode)...")
    dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)
    
    phrases, topics, models, prompt_indices = [], [], [], []
    total_scanned = 0
    MAX_LINES_TO_SCAN = 10000

    print("Beginning scan of dataset lines...")
    for line in dataset['clusters']:
        total_scanned += 1
        
        if total_scanned % 50000 == 0:
            print(f"Lines scanned : {total_scanned:,} | Points retained : {len(phrases):,}")

        topic_line = line.get('topic')
        phrase_line = line.get('factoid') 

        if not topic_line or not phrase_line:
            continue
        
        # On conserve TOUTES les phrases valides (sans aucune limite par topic)
        phrases.append(phrase_line)
        topics.append(topic_line)
        models.append(line.get('model_id'))
        prompt_indices.append(line.get('prompt_index'))
        
        if total_scanned >= MAX_LINES_TO_SCAN:
             break

    print(f"Scan terminated! {total_scanned:,} lines scanned in total.")
    print(f"Final number of points retained for the 3D galaxy : {len(phrases):,}")

    print("Downloading full_responses (Memory)...")
    responses_ds = load_dataset('dwright37/llm-knowledge-collapse', 'full_responses', split='full_responses')
    
    print("Preparing and filtering initial responses...")
    responses_df = responses_ds.to_pandas()
    
    responses_df['topic_clean'] = responses_df['topic'].astype(str).str.strip().str.lower()
    responses_df['prompt_index_clean'] = responses_df['prompt_index'].astype(int)
    responses_df['model_clean'] = responses_df['model_id'].astype(str).str.strip().str.lower()

    print("Extracting complex associations (topic, prompt_index, model) -> setting...")
    setting_mapping = responses_df[['topic_clean', 'prompt_index_clean', 'model_clean', 'setting']].drop_duplicates()
    
    setting_map_dict = {
        (row['topic_clean'], row['prompt_index_clean'], row['model_clean']): row['setting']
        for _, row in setting_mapping.iterrows()
    }

    # 1. Embeddings
    print("Step 1/3 : Calculate embeddings...")
    start_embed = time.time()
    embeddings = embed_sentences(phrases)
    print(f"  -> Embeddings calculated with success in {time.time() - start_embed:.2f} seconds.")

    # 2. Calculate t-SNE 3D
    print("Step 2/3 : Calculating t-SNE 3D (Positioning the points)...")
    start_tsne = time.time()
    perplexity = min(30, len(embeddings) - 1)
    tsne_3d = TSNE(n_components=3, perplexity=perplexity, random_state=42)
    embeddings_3d = tsne_3d.fit_transform(embeddings)
    print(f"  -> 3D coordinates generated in {time.time() - start_tsne:.2f} seconds.")

    galaxy_df = pd.DataFrame({
        'phrase': phrases, 'topic': topics, 'model': models,
        'prompt_index': prompt_indices,
        'x': embeddings_3d[:, 0], 'y': embeddings_3d[:, 1], 'z': embeddings_3d[:, 2]
    })

    print("Step 3/3 : Generating coherent local clusters by topic...")
    computed_clusters = []
    for topic_name, group in galaxy_df.groupby('topic'):
        group_embeddings = embeddings[group.index]
        n_samples = len(group)
        n_clusters = max(3, min(10, n_samples // 15))
        
        if n_samples >= n_clusters:
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(group_embeddings)
        else:
            cluster_labels = np.zeros(n_samples, dtype=int)
            
        for idx, label in zip(group.index, cluster_labels):
            computed_clusters.append((idx, label))
            
    computed_clusters.sort(key=lambda x: x[0])
    galaxy_df['cluster'] = [c[1] for c in computed_clusters]

    galaxy_df['id'] = range(len(galaxy_df))

    print("Linking the 'setting' column to the galaxy points...")
    galaxy_df['setting'] = galaxy_df.apply(
        lambda r: setting_map_dict.get(
            (
                str(r['topic']).strip().lower(), 
                int(r['prompt_index']),
                str(r['model']).strip().lower()
            ), 
            "unknown"
        ),
        axis=1
    )

    print("Saving 3D points in SQLite...")
    galaxy_df.to_sql("galaxy_points", conn, if_exists="replace", index=False)

    print("🧹 Final filtering of responses to keep only the texts of the points...")
    galaxy_df['match_key'] = galaxy_df['topic'].astype(str).str.strip().str.lower() + "_" + galaxy_df['prompt_index'].astype(str) + "_" + galaxy_df['model'].astype(str).str.strip().str.lower()
    responses_df['match_key'] = responses_df['topic_clean'] + "_" + responses_df['prompt_index_clean'].astype(str) + "_" + responses_df['model_clean']

    final_responses_df = responses_df[responses_df['match_key'].isin(galaxy_df['match_key'])].copy()
    
    galaxy_df = galaxy_df.drop(columns=['match_key'])
    final_responses_df = final_responses_df.drop(columns=['topic_clean', 'prompt_index_clean', 'model_clean', 'match_key'])
    del responses_df

    print(f"Saving {len(final_responses_df):,} useful responses in SQLite...")
    final_responses_df['topic'] = final_responses_df['topic'].astype(str).str.strip().str.lower()
    final_responses_df['model_id'] = final_responses_df['model_id'].astype(str).str.strip().str.lower()
    final_responses_df['prompt_index'] = final_responses_df['prompt_index'].astype(int)
    
    final_responses_df.to_sql("responses", conn, if_exists="replace", index=False)
    del final_responses_df
    del galaxy_df

    print("Creating performance indexes for SQLite...")
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX idx_galaxy_id ON galaxy_points(id);")
    cursor.execute("CREATE INDEX idx_galaxy_topic ON galaxy_points(topic);")
    cursor.execute("CREATE INDEX idx_galaxy_model ON galaxy_points(model);")
    cursor.execute("CREATE INDEX idx_galaxy_setting ON galaxy_points(setting);")
    cursor.execute("CREATE INDEX idx_lookup_responses ON responses(topic, model_id, prompt_index);")
    
    conn.commit()
    conn.close()
    print(f"Database created in {time.time() - global_start:.2f} seconds!")

if __name__ == "__main__":
    build_database()