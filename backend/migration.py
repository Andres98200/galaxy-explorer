import os
import time
import sqlite3
import pandas as pd
import pyarrow.parquet as pq

def migrate_parquet_to_sqlite():
    CACHE_FILE = "galaxy_cache.parquet"
    RESPONSES_CACHE = "responses_cache.parquet"
    DB_FILE = "galaxy_explorer.db"
    
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)
        print(f"♻️ Ancien fichier {DB_FILE} supprime pour reinitialisation.")

    global_start = time.time()
    print("📦 Connexion a la nouvelle base SQLite...")
    conn = sqlite3.connect(DB_FILE)
    
    # ---------------------------------------------------------
    # PARTIE 1 : Galaxy points
    # ---------------------------------------------------------
    if os.path.exists(CACHE_FILE):
        print("🌌 Lecture du fichier galaxy_cache.parquet...")
        start_time = time.time()
        galaxy_df = pd.read_parquet(CACHE_FILE)
        
        galaxy_df['cluster'] = galaxy_df['cluster'].fillna(-1).astype(int)
        galaxy_df['id'] = range(len(galaxy_df))
        
        print("💾 Injection de la Galaxy dans SQLite...")
        galaxy_df.to_sql("galaxy_points", conn, if_exists="replace", index=False)
        print(f"✅ Table 'galaxy_points' creee en {time.time() - start_time:.2f}s")
        del galaxy_df
    else:
        print(f"❌ Erreur : {CACHE_FILE} introuvable.")
        return

    # ---------------------------------------------------------
    # PARTIE 2 : Les reponses textuelles (Streaming PyArrow)
    # ---------------------------------------------------------
    if os.path.exists(RESPONSES_CACHE):
        print("📦 Lecture du monstre responses_cache.parquet par blocs...")
        start_time = time.time()
        
        parquet_file = pq.ParquetFile(RESPONSES_CACHE)
        is_first = True
        columns = ['topic', 'model_id', 'prompt_index', 'user_prompt', 'text']
        
        # On lit par paquets de 50 000 lignes pour ne pas faire planter Python
        for batch in parquet_file.iter_batches(batch_size=50000, columns=columns):
            chunk = batch.to_pandas()
            
            chunk['topic'] = chunk['topic'].fillna('').astype(str).str.strip().str.lower()
            chunk['model_id'] = chunk['model_id'].fillna('').astype(str).str.strip().str.lower()
            chunk['prompt_index'] = chunk['prompt_index'].fillna(0).astype(int)
            
            if is_first:
                chunk.to_sql("responses", conn, if_exists="replace", index=False)
                is_first = False
            else:
                chunk.to_sql("responses", conn, if_exists="append", index=False)
                
        print(f"✅ Table 'responses' creee avec succes en {time.time() - start_time:.2f}s")
    else:
        print(f"❌ Erreur : {RESPONSES_CACHE} introuvable.")
        return

    # ---------------------------------------------------------
    # PARTIE 3 : Indexation
    # ---------------------------------------------------------
    print("⚡ Creation des index magiques...")
    start_idx = time.time()
    cursor = conn.cursor()
    
    cursor.execute("CREATE INDEX idx_galaxy_id ON galaxy_points(id);")
    cursor.execute("CREATE INDEX idx_galaxy_topic ON galaxy_points(topic);")
    cursor.execute("CREATE INDEX idx_galaxy_model ON galaxy_points(model);")
    cursor.execute("CREATE INDEX idx_lookup_responses ON responses(topic, model_id, prompt_index);")
    
    conn.commit()
    conn.close()
    
    print(f"⏱️ Index crees avec succes en {time.time() - start_idx:.2f}s !")
    print(f"🎉 MIGRATION TERMINEE EN {time.time() - global_start:.2f} SECONDES !\n")

if __name__ == "__main__":
    migrate_parquet_to_sqlite()