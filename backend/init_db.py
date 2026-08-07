# init_db.py
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

DB_FILE = "galaxy_explorer.db"

def build_database():
    if os.path.exists(DB_FILE):
        print(f"✅ La base {DB_FILE} existe déjà. Pas besoin de la reconstruire.")
        return

    print("🌌 Base de données introuvable. Lancement de la génération automatisée...")
    global_start = time.time()
    conn = sqlite3.connect(DB_FILE)

    print("📡 Connexion à Hugging Face pour la table 'clusters' (Streaming)...")
    dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)
    
    phrases, topics, models, prompt_indices = [], [], [], []
    count_data = {}
    MAX_PHRASES_PER_TOPIC = 200
    total_scanned = 0
    MAX_LINES_TO_SCAN = 4000000

    print("🔍 Début du scan des lignes du dataset...")
    for line in dataset['clusters']:
        outfile_scanned = total_scanned + 1
        total_scanned = outfile_scanned
        
        if total_scanned % 50000 == 0:
            print(f"   ⚡ Lignes parcourues : {total_scanned:,} | Points conservés : {len(phrases):,}")

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
            prompt_indices.append(line.get('prompt_index'))
            count_data[topic_line] += 1
        
        if total_scanned >= MAX_LINES_TO_SCAN:
            break

    print(f"📊 Scan terminé ! {total_scanned:,} lignes analysées au total.")
    print(f"🎯 Nombre final de points retenus pour la galaxie 3D : {len(phrases):,}")

    print("📡 Téléchargement des full_responses (Mémoire)...")
    responses_ds = load_dataset('dwright37/llm-knowledge-collapse', 'full_responses', split='full_responses')
    
    print("🧹 Préparation et filtrage initial des réponses...")
    responses_df = responses_ds.to_pandas()
    
    responses_df['topic_clean'] = responses_df['topic'].astype(str).str.strip().str.lower()
    responses_df['prompt_index_clean'] = responses_df['prompt_index'].astype(int)
    responses_df['model_clean'] = responses_df['model_id'].astype(str).str.strip().str.lower()

    print("⚙️ Extraction des associations complexes (topic, prompt_index, model) -> setting...")
    setting_mapping = responses_df[['topic_clean', 'prompt_index_clean', 'model_clean', 'setting']].drop_duplicates()
    
    setting_map_dict = {
        (row['topic_clean'], row['prompt_index_clean'], row['model_clean']): row['setting']
        for _, row in setting_mapping.iterrows()
    }

    # 1. Calculs des embeddings
    print("🧠 Étape 1/3 : Calcul des embeddings (Génération des vecteurs d'IA)...")
    start_embed = time.time()
    embeddings = embed_sentences(phrases)
    print(f"  -> Embeddings calculés avec succès en {time.time() - start_embed:.2f} secondes.")

    # 2. Calcul du t-SNE 3D
    print("🧠 Étape 2/3 : Calcul du t-SNE 3D (Positionnement des points)...")
    start_tsne = time.time()
    perplexity = min(30, len(embeddings) - 1)
    tsne_3d = TSNE(n_components=3, perplexity=perplexity, random_state=42)
    embeddings_3d = tsne_3d.fit_transform(embeddings)
    print(f"  -> Coordonnées 3D générées en {time.time() - start_tsne:.2f} secondes.")

    galaxy_df = pd.DataFrame({
        'phrase': phrases, 'topic': topics, 'model': models,
        'prompt_index': prompt_indices,
        'x': embeddings_3d[:, 0], 'y': embeddings_3d[:, 1], 'z': embeddings_3d[:, 2]
    })

    # 3. Calcul de clusters PROPRES et LOCAUX par topic (ex: KMeans à ~6-8 clusters par topic)
    print("🧠 Étape 3/3 : Génération de clusters locaux cohérents par topic...")
    computed_clusters = []
    for topic_name, group in galaxy_df.groupby('topic'):
        group_embeddings = embeddings[group.index]
        n_samples = len(group)
        # On adapte dynamiquement le nombre de clusters (entre 3 et 10 selon la taille)
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

    print("🔗 Liaison de la colonne 'setting' aux points de la galaxie...")
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

    print("💾 Sauvegarde des points 3D dans SQLite...")
    galaxy_df.to_sql("galaxy_points", conn, if_exists="replace", index=False)

    print("🧹 Filtrage final des réponses pour ne garder QUE les textes des points...")
    galaxy_df['match_key'] = galaxy_df['topic'].astype(str).str.strip().str.lower() + "_" + galaxy_df['prompt_index'].astype(str) + "_" + galaxy_df['model'].astype(str).str.strip().str.lower()
    responses_df['match_key'] = responses_df['topic_clean'] + "_" + responses_df['prompt_index_clean'].astype(str) + "_" + responses_df['model_clean']

    final_responses_df = responses_df[responses_df['match_key'].isin(galaxy_df['match_key'])].copy()
    
    galaxy_df = galaxy_df.drop(columns=['match_key'])
    final_responses_df = final_responses_df.drop(columns=['topic_clean', 'prompt_index_clean', 'model_clean', 'match_key'])
    del responses_df

    print(f"💾 Écriture de {len(final_responses_df):,} réponses utiles dans SQLite...")
    final_responses_df['topic'] = final_responses_df['topic'].astype(str).str.strip().str.lower()
    final_responses_df['model_id'] = final_responses_df['model_id'].astype(str).str.strip().str.lower()
    final_responses_df['prompt_index'] = final_responses_df['prompt_index'].astype(int)
    
    final_responses_df.to_sql("responses", conn, if_exists="replace", index=False)
    del final_responses_df
    del galaxy_df

    print("⚡ Création des index de performance pour SQLite...")
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX idx_galaxy_id ON galaxy_points(id);")
    cursor.execute("CREATE INDEX idx_galaxy_topic ON galaxy_points(topic);")
    cursor.execute("CREATE INDEX idx_galaxy_model ON galaxy_points(model);")
    cursor.execute("CREATE INDEX idx_galaxy_setting ON galaxy_points(setting);")
    cursor.execute("CREATE INDEX idx_lookup_responses ON responses(topic, model_id, prompt_index);")
    
    conn.commit()
    conn.close()
    print(f"🎉 Base propre recréée avec succès en {time.time() - global_start:.2f} secondes !")

if __name__ == "__main__":
    build_database()