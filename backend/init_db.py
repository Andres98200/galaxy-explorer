# init_db.py
import os
import time
import sqlite3
from datasets import load_dataset
from sklearn.manifold import TSNE
from llm_knowledge.epistemic_diversity import embed_sentences
import pandas as pd

DB_FILE = "galaxy_explorer.db"

def build_database():
    if os.path.exists(DB_FILE):
        print(f"✅ La base {DB_FILE} existe déjà. Pas besoin de la reconstruire.")
        return

    print("🌌 Base de données introuvable. Lancement de la génération automatisée...")
    global_start = time.time()
    conn = sqlite3.connect(DB_FILE)

    # ---------------------------------------------------------
    # 1. Téléchargement et génération de la Galaxy (Points 3D)
    # ---------------------------------------------------------
    print("📡 Connexion à Hugging Face pour la table 'clusters'...")
    dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)
    
    phrases, topics, models, clusters, prompt_indices = [], [], [], [], []
    count_data = {}
    MAX_PHRASES_PER_TOPIC = 2000
    total_scanned = 0
    MAX_LINES_TO_SCAN = 15000000 

    for line in dataset['clusters']:
        total_scanned += 1
        topic_line = line.get('topic')
        phrase_line = line.get('factoid') 

        if not topic_line or not phrase_line:
            continue
        
        if topic_line not in count_data:
            count_data[topic_line] = 0
        
        if count_data[topic_line] < MAX_PHRASES_PER_TOPIC:
            phrases.append(phrase_line)
            topics.append(topic_line)
            models.append(line.get('model_id'))
            clusters.append(line.get('cluster'))
            prompt_indices.append(line.get('prompt_index'))
            count_data[topic_line] += 1
        
        if total_scanned >= MAX_LINES_TO_SCAN:
            break

    print("🧠 Calcul des embeddings et du t-SNE 3D (Cette étape peut prendre du temps)...")
    embeddings = embed_sentences(phrases)
    perplexity = min(30, len(embeddings) - 1)
    tsne_3d = TSNE(n_components=3, perplexity=perplexity, random_state=42)
    embeddings_3d = tsne_3d.fit_transform(embeddings)

    galaxy_df = pd.DataFrame({
        'phrase': phrases, 'topic': topics, 'model': models,
        'cluster': clusters, 'prompt_index': prompt_indices,
        'x': embeddings_3d[:, 0], 'y': embeddings_3d[:, 1], 'z': embeddings_3d[:, 2]
    })
    galaxy_df['id'] = range(len(galaxy_df))
    galaxy_df['cluster'] = galaxy_df['cluster'].fillna(-1).astype(int)

    print("💾 Sauvegarde des points dans SQLite...")
    galaxy_df.to_sql("galaxy_points", conn, if_exists="replace", index=False)
    del galaxy_df

    # ---------------------------------------------------------
    # 2. Téléchargement des réponses (Les 4 GB de texte bruts)
    # ---------------------------------------------------------
    print("📡 Téléchargement des full_responses (Streaming)...")
    # On charge le dataset en mode classique pour le convertir
    responses_ds = load_dataset('dwright37/llm-knowledge-collapse', 'full_responses', split='full_responses')
    
    # Pour ne pas exploser la RAM, on convertit par paquets vers SQL
    print("💾 Écriture par blocs des textes dans SQLite...")
    responses_df = responses_ds.to_pandas()
    responses_df['topic'] = responses_df['topic'].astype(str).str.strip().str.lower()
    responses_df['model_id'] = responses_df['model_id'].astype(str).str.strip().str.lower()
    responses_df['prompt_index'] = responses_df['prompt_index'].astype(int)
    
    responses_df.to_sql("responses", conn, if_exists="replace", index=False)
    del responses_df

    # ---------------------------------------------------------
    # 3. Création automatique des INDEX
    # ---------------------------------------------------------
    print("⚡ Création automatique des index de performance...")
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX idx_galaxy_id ON galaxy_points(id);")
    cursor.execute("CREATE INDEX idx_galaxy_topic ON galaxy_points(topic);")
    cursor.execute("CREATE INDEX idx_galaxy_model ON galaxy_points(model);")
    cursor.execute("CREATE INDEX idx_lookup_responses ON responses(topic, model_id, prompt_index);")
    
    conn.commit()
    conn.close()
    print(f"🎉 Base automatisée créée en {time.time() - global_start:.2f} secondes !")

if __name__ == "__main__":
    build_database()