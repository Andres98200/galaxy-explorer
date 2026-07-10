import os
import time
from typing import List, Dict, Any, Optional
from datasets import load_dataset 
from sklearn.manifold import TSNE 
from llm_knowledge.epistemic_diversity import embed_sentences
import pandas as pd

class DataRepository:
    def __init__(self):
        CACHE_FILE = "galaxy_cache.parquet"
        RESPONSES_CACHE = "responses_cache.parquet"
        
        # Initialisation des structures d'indexation globale
        self.responses_index = {}
        self.topic_groups = {}

        if os.path.exists(CACHE_FILE) and os.path.exists(RESPONSES_CACHE):
            start_load = time.time()
            print("🌌 Loading galaxy from the cache file...")
            self.galaxy_df = pd.read_parquet(CACHE_FILE)
            print(f"✅ Galaxy loaded from cache with shape: {self.galaxy_df.shape}")
            self.total_cached_points = len(self.galaxy_df)
            
            print("📦 Loading full responses cache...")
            responses_df = pd.read_parquet(RESPONSES_CACHE)
            
            # 🚀 OPTIMISATION 1 : Reconstruction de l'index des textes
            print("⚡ Indexing responses for instant lookups...")
            start_idx = time.time()
            for idx, row in responses_df.iterrows():
                key = (
                    str(row.get('topic', '')).strip().lower(), 
                    str(row.get('model_id', '')).strip().lower(), 
                    int(row.get('prompt_index', 0))
                )
                self.responses_index[key] = {
                    "original_prompt": row.get('user_prompt', 'No prompt available'),
                    "full_response": row.get('text', 'No text available')
                }
            print(f"⏱️ Done! Indexing responses took {time.time() - start_idx:.2f} seconds.")
            
            # 🚀 OPTIMISATION 2 : Pré-groupement par Topic pour éviter les filtres Pandas au clic
            print("⚡ Pre-grouping topics for instant details retrieval...")
            start_group = time.time()
            self.topic_groups = {topic: group for topic, group in self.galaxy_df.groupby('topic')}
            print(f"⏱️ Done! Pre-grouping topics took {time.time() - start_group:.2f} seconds.")
            
            del responses_df  # Libération immédiate de la mémoire vive
            print(f"🎉 TOTAL CACHE INITIALIZATION TIME: {time.time() - start_load:.2f} seconds.\n")
            return
        
        global_start = time.time()
        print("⚠️ No cache file found, Connexion to Hugging Face API...")
        
        start_step = time.time()
        dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)
        dataset = dataset.shuffle(seed=42, buffer_size=50000)
        
        print("Collecting all the topics...")
        phrases = []
        topics = []
        models = []
        clusters = []
        prompt_indices = []

        count_data = {}
        MAX_PHRASES_PER_TOPIC = 2000
        self.total_scanned = 0
        MAX_LINES_TO_SCAN = 15000000 

        for line in dataset['clusters']:
            self.total_scanned += 1
            if self.total_scanned % 2000 == 0:
                print(f"Lines scanned: {self.total_scanned}")

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
            
            if self.total_scanned >= MAX_LINES_TO_SCAN:
                break

        embeddings = embed_sentences(phrases)
        perplexity = min(30, len(embeddings) - 1)
        tsne_3d = TSNE(n_components=3, perplexity=perplexity, random_state=42)
        embeddings_3d = tsne_3d.fit_transform(embeddings)

        self.galaxy_df = pd.DataFrame({
            'phrase': phrases,
            'topic': topics,
            'model': models,
            'cluster': clusters,
            'prompt_index': prompt_indices,
            'x': embeddings_3d[:, 0],
            'y': embeddings_3d[:, 1],
            'z': embeddings_3d[:, 2]
        })
        self.galaxy_df['id'] = range(len(self.galaxy_df))
        self.galaxy_df['cluster'] = self.galaxy_df['cluster'].fillna(-1).astype(int)
        self.total_cached_points = len(self.galaxy_df)

        print("Downloading full_responses subset...")
        responses_ds = load_dataset('dwright37/llm-knowledge-collapse', 'full_responses', split='full_responses')
        responses_df = responses_ds.to_pandas()
        
        responses_df['topic'] = responses_df['topic'].astype(str).str.strip().str.lower()
        responses_df['model_id'] = responses_df['model_id'].astype(str).str.strip().str.lower()
        responses_df['prompt_index'] = responses_df['prompt_index'].astype(int)

        print("Saving data to Parquet cache files...")
        self.galaxy_df.to_parquet(CACHE_FILE)
        responses_df.to_parquet(RESPONSES_CACHE)
        
        # 🚀 Reconstruction de l'index au premier démarrage (sans cache existant)
        print("⚡ Indexing responses for instant lookups...")
        for idx, row in responses_df.iterrows():
            key = (str(row['topic']), str(row['model_id']), int(row['prompt_index']))
            self.responses_index[key] = {
                "original_prompt": row.get('user_prompt', 'No prompt available'),
                "full_response": row.get('text', 'No text available')
            }
        
        print("⚡ Pre-grouping topics for instant details retrieval...")
        self.topic_groups = {topic: group for topic, group in self.galaxy_df.groupby('topic')}
        
        del responses_df
        print(f"🎉 TOTAL INITIALIZATION TIME: {time.time() - global_start:.2f} seconds.\n")

    def get_metadata_options(self) -> Dict[str, List[str]]:
        return {
            "models": sorted(self.galaxy_df['model'].unique().tolist()),
            "topics": sorted(self.galaxy_df['topic'].unique().tolist()),  
            "stats": {
                "total_dataset_scanned": getattr(self, 'total_scanned', 15000000),
                "total_embedded_phrases": self.total_cached_points
            }    
        }
        
    def get_filtered_points(self, selected_models: Optional[List[str]], selected_topics: Optional[List[str]]) -> List[Dict[str, Any]]:
        df_temp = self.galaxy_df.copy()
        if selected_models:
            df_temp = df_temp[df_temp['model'].isin(selected_models)]
        if selected_topics:
            df_temp = df_temp[df_temp['topic'].isin(selected_topics)]
            
        points = df_temp.to_dict(orient="records")
        for p in points:
            p['cluster'] = int(p['cluster']) if pd.notna(p['cluster']) else -1
        return points
    
    def get_point_details(self, point_id: int) -> Dict[str, Any]:
        global_start = time.time()
        
        # TIMER 1 : Accès O(1) au point sélectionné
        start_step = time.time()
        try:
            target_point = self.galaxy_df.iloc[point_id]
        except IndexError:
            return {"error": "Point not found"}
        print(f"  ⏱️ [Details] Step 1: iloc target point took {time.time() - start_step:.6f} seconds.")
        
        target_topic = target_point['topic']

        # TIMER 2 : Récupération du sous-groupe pré-calculé (fini le filtre lent !)
        start_step = time.time()
        if hasattr(self, 'topic_groups') and target_topic in self.topic_groups:
            cluster_df = self.topic_groups[target_topic].copy()
        else:
            cluster_df = self.galaxy_df[self.galaxy_df['topic'] == target_topic].copy()
        print(f"  ⏱️ [Details] Step 2: Extracting topic sub-group took {time.time() - start_step:.6f} seconds.")

        # TIMER 3 : Tri et extraction des phrases clés
        start_step = time.time()
        cluster_df['dist_internal'] = ((cluster_df['x'] - target_point['x'])**2 + 
                                       (cluster_df['y'] - target_point['y'])**2 + 
                                       (cluster_df['z'] - target_point['z'])**2)**0.5
        cluster_df = cluster_df.sort_values('dist_internal')

        phrases_list = []
        seen_phrases = set()
        for idx, row in cluster_df.iterrows():
            if row['phrase'] in seen_phrases:
                continue
            seen_phrases.add(row['phrase'])
            score = max(1, min(100, int(100 / (1 + row['dist_internal']))))
            phrases_list.append({"phrase": row['phrase'], "score": score})
            if len(phrases_list) >= 6:
                break
        print(f"  ⏱️ [Details] Step 3: Key phrases sorting took {time.time() - start_step:.6f} seconds.")

        # TIMER 4 : Calcul de la répartition des modèles
        start_step = time.time()
        model_counts = cluster_df['model'].value_counts()
        total_models = len(cluster_df) if len(cluster_df) > 0 else 1
        model_list = [{"name": str(m), "percentage": int(c / total_models * 100)} for m, c in model_counts.items()]
        print(f"  ⏱️ [Details] Step 4: Model distribution took {time.time() - start_step:.6f} seconds.")

        # TIMER 5 : Calcul vectoriel des 5 plus proches voisins géométriques 3D
        start_step = time.time()
        distances = ((self.galaxy_df['x'] - target_point['x'])**2 + 
                     (self.galaxy_df['y'] - target_point['y'])**2 + 
                     (self.galaxy_df['z'] - target_point['z'])**2)**0.5
        
        closest_indices = distances.nsmallest(6).index
        
        formatted_neighbors = []
        for idx in closest_indices:
            if idx == point_id:
                continue
            row = self.galaxy_df.iloc[idx]
            dist_val = distances.loc[idx]
            score_visuel = max(1, min(100, int(100 / (1 + dist_val))))
            formatted_neighbors.append({
                "name": f"Neighbor : {row['id']} ({row['topic']})",
                "percentage": score_visuel
            })
            if len(formatted_neighbors) >= 5:
                break
        print(f"  ⏱️ [Details] Step 5: Visual neighbors calculation took {time.time() - start_step:.6f} seconds.")
        print(f"🚀 [Details API] TOTAL EXECUTION TIME: {time.time() - global_start:.4f} seconds.\n")
        
        return {"phrases": phrases_list, "models": model_list, "neighbors": formatted_neighbors}
    
    def get_points_source_text(self, point_id: int) -> Dict[str, Any]:
        global_start = time.time()
        
        # TIMER 1 : Lecture du point en O(1)
        start_step = time.time()
        try:
            target_point = self.galaxy_df.iloc[point_id]
        except IndexError:
            return {"error": "Point not found"}
        print(f"  ⏱️ [Source-Text] Step 1: iloc target point took {time.time() - start_step:.6f} seconds.")
        
        # TIMER 2 : Formatage des clés de recherche
        start_step = time.time()
        target_prompt_index = target_point.get('prompt_index')
        target_topic = str(target_point.get('topic')).strip().lower()
        target_model = str(target_point.get('model')).strip().lower()

        if target_prompt_index is None:
            return {"error": "No prompt index linked to this point"}
        
        lookup_key = (target_topic, target_model, int(target_prompt_index))
        print(f"  ⏱️ [Source-Text] Step 2: Key string formatting took {time.time() - start_step:.6f} seconds.")

        # TIMER 3 : Lecture directe O(1) dans l'index dictionnaire (L'ancien point noir à 41s !)
        start_step = time.time()
        match_data = self.responses_index.get(lookup_key)
        print(f"  ⏱️ [Source-Text] Step 3: Dictionnaire lookup took {time.time() - start_step:.6f} seconds.")

        if match_data:
            print(f"🚀 [Source-Text API] TOTAL EXECUTION TIME: {time.time() - global_start:.4f} seconds.\n")
            return {
                "model": str(target_point['model']),
                "topic": str(target_point['topic']),
                "original_prompt": match_data["original_prompt"],
                "full_response": match_data["full_response"]            
            }
                
        print(f"❌ [Source-Text API] Text context not found for key {lookup_key} after {time.time() - global_start:.4f} seconds.\n")
        return {"error": f"Text context not found"}