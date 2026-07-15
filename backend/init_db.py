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
        
        # Affichage de l'avancement toutes les 50 000 lignes scannées
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

    print("💾 Sauvegarde des points 3D dans SQLite...")
    galaxy_df.to_sql("galaxy_points", conn, if_exists="replace", index=False)

    print("🔑 Extraction des clés pour le filtrage des réponses...")
    galaxy_keys = set(
        zip(
            galaxy_df['topic'].astype(str).str.strip().str.lower(),
            galaxy_df['prompt_index'].astype(int)
        )
    )
    del galaxy_df # Libération immédiate de la RAM

    # 2. Téléchargement et filtrage intelligent des réponses
    print("📡 Téléchargement des full_responses (Streaming)...")
    responses_ds = load_dataset('dwright37/llm-knowledge-collapse', 'full_responses', split='full_responses')
    
    print("🧹 Filtrage en cours pour éliminer les gigaoctets superflus...")
    responses_df = responses_ds.to_pandas()
    
    responses_df['topic_clean'] = responses_df['topic'].astype(str).str.strip().str.lower()
    responses_df['prompt_index_clean'] = responses_df['prompt_index'].astype(int)
    
    responses_df = responses_df[
        responses_df.set_index(['topic_clean', 'prompt_index_clean']).index.isin(galaxy_keys)
    ]
    
    responses_df = responses_df.drop(columns=['topic_clean', 'prompt_index_clean'])

    print(f"💾 Écriture de {len(responses_df):,} réponses filtrées dans SQLite...")
    responses_df['topic'] = responses_df['topic'].astype(str).str.strip().str.lower()
    responses_df['model_id'] = responses_df['model_id'].astype(str).str.strip().str.lower()
    responses_df['prompt_index'] = responses_df['prompt_index'].astype(int)
    
    responses_df.to_sql("responses", conn, if_exists="replace", index=False)
    del responses_df

    # 3. Création des index (inchangé)
    print("⚡ Création des index de performance pour SQLite...")
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX idx_galaxy_id ON galaxy_points(id);")
    cursor.execute("CREATE INDEX idx_galaxy_topic ON galaxy_points(topic);")
    cursor.execute("CREATE INDEX idx_galaxy_model ON galaxy_points(model);")
    cursor.execute("CREATE INDEX idx_lookup_responses ON responses(topic, model_id, prompt_index);")
    
    conn.commit()
    conn.close()
    print(f"🎉 Base ultra-légère créée avec succès en {time.time() - global_start:.2f} secondes !")

if __name__ == "__main__":
    build_database()