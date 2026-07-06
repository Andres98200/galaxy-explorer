import os
import time  # ⏱️ Import du module de chronométrage
from typing import List, Dict, Any, Optional
from datasets import load_dataset 
from sklearn.manifold import TSNE 
from llm_knowledge.epistemic_diversity import embed_sentences
import pandas as pd

class DataRepository:
    def __init__(self):
        CACHE_FILE = "galaxy_cache.parquet"
        RESPONSES_CACHE = "responses_cache.parquet"

        if os.path.exists(CACHE_FILE) and os.path.exists(RESPONSES_CACHE):
            start_load = time.time()
            print("Loading galaxy from the cache file...")
            self.galaxy_df = pd.read_parquet(CACHE_FILE)
            print("Galaxy loaded from cache with shape:", self.galaxy_df.shape)
            self.total_cached_points = len(self.galaxy_df)
            
            print("Loading full responses index...")
            self.responses_df = pd.read_parquet(RESPONSES_CACHE)
            print(f"⏱️ Cache loading took {time.time() - start_load:.2f} seconds.")
            return
        
        global_start = time.time() # Début du grand chrono
        print("No cache file found, Connexion to Hugging Face API")
        
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
                print(f"Limit of {MAX_LINES_TO_SCAN} lines scanned reached, stopping the data collection.")
                break
        print(f"⏱️ Scanning clusters took {time.time() - start_step:.2f} seconds.")

        ### Embedding the phrases
        start_step = time.time()
        print("Embedding the phrases...")
        embeddings = embed_sentences(phrases)
        print(f"⏱️ Embedding generation took {time.time() - start_step:.2f} seconds.")

        ### t-SNE reduction
        start_step = time.time()
        print("Reduction of the dimension with t-SNE...")
        perplexity = min(30, len(embeddings) - 1)
        tsne_3d = TSNE(n_components=3, perplexity=perplexity, random_state=42)
        embeddings_3d = tsne_3d.fit_transform(embeddings)
        print(f"⏱️ t-SNE reduction took {time.time() - start_step:.2f} seconds.")

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
        
        print("3D galaxy dataframe created with shape:", self.galaxy_df.shape)
        self.total_cached_points = len(self.galaxy_df)

        # ⚡ TÉLÉCHARGEMENT DE LA TABLE DES CORRESPONDANCES (FULL_RESPONSES)
        start_step = time.time()
        print("Downloading full_responses subset to avoid runtime streaming (this might take a while)...")
        responses_ds = load_dataset('dwright37/llm-knowledge-collapse', 'full_responses', split='full_responses')
        self.responses_df = responses_ds.to_pandas()
        
        self.responses_df['topic'] = self.responses_df['topic'].astype(str).str.strip().str.lower()
        self.responses_df['model_id'] = self.responses_df['model_id'].astype(str).str.strip().str.lower()
        self.responses_df['prompt_index'] = self.responses_df['prompt_index'].astype(int)
        print(f"⏱️ Downloading and parsing full_responses took {time.time() - start_step:.2f} seconds.")

        # Sauvegarde sur le disque
        start_step = time.time()
        print(f"Saving data on the cache files...")
        self.galaxy_df.to_parquet(CACHE_FILE)
        self.responses_df.to_parquet(RESPONSES_CACHE)
        print(f"⏱️ Saving Parquet files took {time.time() - start_step:.2f} seconds.")
        
        print(f"🎉 TOTAL INITIALIZATION TIME: {time.time() - global_start:.2f} seconds.")

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
            
        # 🎨 TICKET #27 : La coloration par cluster est autorisée uniquement si 1 seul topic est actif
        single_topic_mode = (selected_topics is not None and len(selected_topics) == 1)
        
        points = df_temp.to_dict(orient="records")
        for p in points:
            p['cluster'] = int(p['cluster']) if pd.notna(p['cluster']) else -1
            p['can_color_by_cluster'] = single_topic_mode
            
        return points
    
    def get_point_details(self, point_id: int) -> Dict[str, Any]:
        matched_points = self.galaxy_df[self.galaxy_df['id'] == point_id]
        if matched_points.empty:
            return {"error": "Point not found"}
        
        target_point = matched_points.iloc[0]
        target_topic = target_point['topic']

        # 🎯 1. TOP PHRASES ASSOCIÉES (Élargi au Topic complet pour retrouver du volume, classé par distance)
        cluster_df = self.galaxy_df[self.galaxy_df['topic'] == target_topic].copy()
        
        # On calcule la distance de toutes les phrases de ce topic par rapport au point cliqué
        cluster_df['dist_internal'] = ((cluster_df['x'] - target_point['x'])**2 + 
                                       (cluster_df['y'] - target_point['y'])**2 + 
                                       (cluster_df['z'] - target_point['z'])**2)**0.5
        
        # On trie pour avoir les plus proches géométriquement en premier
        cluster_df = cluster_df.sort_values('dist_internal')

        phrases_list = []
        # On utilise `.unique()` sur les phrases pour éviter de t'afficher 6 fois la même ligne !
        seen_phrases = set()
        for idx, row in cluster_df.iterrows():
            if row['phrase'] in seen_phrases:
                continue
            seen_phrases.add(row['phrase'])
            
            score = max(1, min(100, int(100 / (1 + row['dist_internal']))))
            phrases_list.append({"phrase": row['phrase'], "score": score})
            
            if len(phrases_list) >= 6: # On s'arrête dès qu'on a 6 phrases uniques distinctes
                break

        # 🎯 2. DISTRIBUTION DES MODÈLES
        model_counts = cluster_df['model'].value_counts()
        total_models = len(cluster_df) if len(cluster_df) > 0 else 1
        model_list = [{"name": str(m), "percentage": int(c / total_models * 100)} for m, c in model_counts.items()]

        # 🎯 3. VRAIS VOISINS GÉOMÉTRIQUES (Affichage par ID uniquement pour le design)
        df_temp = self.galaxy_df.copy()
        df_temp['distance'] = ((df_temp['x'] - target_point['x'])**2 + 
                               (df_temp['y'] - target_point['y'])**2 + 
                               (df_temp['z'] - target_point['z'])**2)**0.5
        
        df_temp = df_temp[df_temp['id'] != point_id]
        closest_points = df_temp.sort_values('distance').head(5)
        
        formatted_neighbors = []
        for idx, row in closest_points.iterrows():
            score_visuel = max(1, min(100, int(100 / (1 + row['distance']))))
            
            # 🌟 Modification ici : On affiche uniquement l'ID du point et son Topic pour que ce soit clean
            formatted_neighbors.append({
                "name": f"Neighbor : {row['id']} ({row['topic']})",
                "percentage": score_visuel
            })
        
        return {
            "phrases": phrases_list,
            "models": model_list,
            "neighbors": formatted_neighbors
        }
    
    def get_points_source_text(self, point_id: int) -> Dict[str, Any]:
        start_query = time.time()
        
        matched_points = self.galaxy_df[self.galaxy_df['id'] == point_id]
        if matched_points.empty:
            return {"error": "Point not found"}
        
        target_point = matched_points.iloc[0]
        target_prompt_index = target_point.get('prompt_index')
        target_topic = str(target_point.get('topic')).strip().lower()
        target_model = str(target_point.get('model')).strip().lower()

        if target_prompt_index is None:
            return {"Error": "No prompt index linked to this point"}
        
        result_df = self.responses_df[
            (self.responses_df['prompt_index'] == int(target_prompt_index)) &
            (self.responses_df['topic'] == target_topic) &
            (self.responses_df['model_id'] == target_model)
        ]

        if not result_df.empty:
            match = result_df.iloc[0]
            print(f"⏱️ Runtime text lookup took {time.time() - start_query:.4f} seconds.")
            return {
                "model": str(target_point['model']),
                "topic": str(target_point['topic']),
                "original_prompt": match.get('user_prompt', 'No prompt available'),
                "full_response": match.get('text', 'No text available')            
            }
                
        print(f"⏱️ Runtime text lookup failed after {time.time() - start_query:.4f} seconds.")
        return {"error": f"Text context not found for prompt {target_prompt_index}, topic '{target_topic}', model '{target_model}'"}