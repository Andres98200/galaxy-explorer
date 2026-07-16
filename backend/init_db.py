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

    print("📡 Connexion à Hugging Face pour la table 'clusters' (Streaming)...")
    dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)
    
    phrases, topics, models, clusters, prompt_indices = [], [], [], [], []
    count_data = {}
    MAX_PHRASES_PER_TOPIC = 200
    total_scanned = 0
    MAX_LINES_TO_SCAN = 4000000

    print("🔍 Début du scan des lignes du dataset...")
    for line in dataset['clusters']:
        total_scanned += 1
        
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
            clusters.append(line.get('cluster'))
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

    # 2. Calculs géométriques et création de galaxy_df
    print("🧠 Étape 1/2 : Calcul des embeddings (Génération des vecteurs d'IA)...")
    start_embed = time.time()
    embeddings = embed_sentences(phrases)
    print(f"   -> Embeddings calculés avec succès en {time.time() - start_embed:.2f} secondes.")

    print("🧠 Étape 2/2 : Calcul du t-SNE 3D (Positionnement des points)...")
    start_tsne = time.time()
    perplexity = min(30, len(embeddings) - 1)
    tsne_3d = TSNE(n_components=3, perplexity=perplexity, random_state=42)
    embeddings_3d = tsne_3d.fit_transform(embeddings)
    print(f"   -> Coordonnées 3D générées en {time.time() - start_tsne:.2f} secondes.")

    galaxy_df = pd.DataFrame({
        'phrase': phrases, 'topic': topics, 'model': models,
        'cluster': clusters, 'prompt_index': prompt_indices,
        'x': embeddings_3d[:, 0], 'y': embeddings_3d[:, 1], 'z': embeddings_3d[:, 2]
    })
    galaxy_df['id'] = range(len(galaxy_df))
    galaxy_df['cluster'] = galaxy_df['cluster'].fillna(-1).astype(int)

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

    # 🛑 AJOUT FILTRAGE STRICT ANTI-CRASH DISQUE 🛑
    print("🧹 Filtrage final des réponses pour ne garder QUE les textes des 2 000 points...")
    galaxy_df['match_key'] = galaxy_df['topic'].astype(str).str.strip().str.lower() + "_" + galaxy_df['prompt_index'].astype(str) + "_" + galaxy_df['model'].astype(str).str.strip().str.lower()
    responses_df['match_key'] = responses_df['topic_clean'] + "_" + responses_df['prompt_index_clean'].astype(str) + "_" + responses_df['model_clean']

    final_responses_df = responses_df[responses_df['match_key'].isin(galaxy_df['match_key'])].copy()
    
    # Nettoyage avant insertion
    galaxy_df = galaxy_df.drop(columns=['match_key'])
    final_responses_df = final_responses_df.drop(columns=['topic_clean', 'prompt_index_clean', 'model_clean', 'match_key'])
    del responses_df

    print(f"💾 Écriture de seulement {len(final_responses_df):,} réponses utiles dans SQLite...")
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
    cursor.execute("CREATE INDEX idx_galaxy_setting ON galaxy_points(setting);") # Index pour le filtre RAG/IFT ⚡
    cursor.execute("CREATE INDEX idx_lookup_responses ON responses(topic, model_id, prompt_index);")
    
    conn.commit()
    conn.close()
    print(f"🎉 Base ultra-légère créée avec succès en {time.time() - global_start:.2f} secondes !")