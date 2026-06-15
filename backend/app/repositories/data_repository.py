import os
from typing import List, Dict, Any, Optional
from datasets import load_dataset 
from sklearn.manifold import TSNE 
from llm_knowledge.epistemic_diversity import embed_sentences
import pandas as pd

class DataRepository:
    def __init__(self):
        CACHE_FILE = "galaxy_cache.parquet"

        if os.path.exists(CACHE_FILE):
            print("Loading galaxy from the cache file...")
            self.galaxy_df = pd.read_parquet(CACHE_FILE)
            print("Galaxy loaded from cache with shape:", self.galaxy_df.shape)
            self.total_cached_points = len(self.galaxy_df)
            return
        

        print("No cache file found, Connexion to Hugging Face API")
        dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)

        dataset = dataset.shuffle(seed=42, buffer_size=50000)
        
        print("Collecting all the topics", )

        phrases = []
        topics = []
        models = []
        clusters = []

        count_data = {}
        MAX_PHRASES_PER_TOPIC = 2000
        self.total_scanned = 0
        MAX_LINES_TO_SCAN = 10000000  # Limite pour éviter de scanner tout le dataset en streaming (ajustable)

        for line in dataset['clusters']:
            self.total_scanned += 1
            
            # Petit indicateur visuel pour voir que ça avance
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
                count_data[topic_line] += 1
            
            if self.total_scanned >= MAX_LINES_TO_SCAN:
                print(f"Limite of {MAX_LINES_TO_SCAN} lines scanned reached, stopping the data collection.")
                break

        ### Embedding the phrases
        print("Embedding the phrases")
        embeddings = embed_sentences(phrases)

        print("Reduction of the dimension with t-SNE")
        perplexity = min(30, len(embeddings) - 1)
        tsne_3d = TSNE(n_components=3, perplexity=perplexity, random_state=42)
        embeddings_3d = tsne_3d.fit_transform(embeddings)

        self.galaxy_df = pd.DataFrame({
            'phrase': phrases,
            'topic': topics,
            'model': models,
            'cluster': clusters,
            'x': embeddings_3d[:, 0],
            'y': embeddings_3d[:, 1],
            'z': embeddings_3d[:, 2]
        })
        self.galaxy_df['cluster'] = self.galaxy_df['cluster'].fillna(-1).astype(int)
        print("3D galaxy dataframe created with shape:", self.galaxy_df.shape)

        self.total_cached_points = len(self.galaxy_df)

        print(f"Saving data on the cache file {CACHE_FILE} for faster loading")
        self.galaxy_df.to_parquet(CACHE_FILE)
        print("Data saved to cache successfully.")

    def get_metadata_options(self) -> Dict[str, List[str]]:
            return {
                "models":sorted(self.galaxy_df['model'].unique().tolist()),
                "topics":sorted(self.galaxy_df['topic'].unique().tolist()),  
                "stats": {
                    "total_dataset_scanned": getattr(self, 'total_scanned', 10000000),
                    "total_embedded_phrases": self.total_cached_points
                }    
            }
        
    def get_filtered_points(self, selected_models: Optional[List[str]], selected_topics: Optional[List[str]]) -> List[Dict[str, Any]]:
        """Filtrage instantané en mémoire (RAM) pour une fluidité à 60 FPS sur le Front-End"""
        df_temp = self.galaxy_df.copy()
        
        if selected_models:
            df_temp = df_temp[df_temp['model'].isin(selected_models)]
            
        if selected_topics:
            df_temp = df_temp[df_temp['topic'].isin(selected_topics)]
            
        df_temp = df_temp.reset_index().rename(columns={'index': 'id'})
        return df_temp.to_dict(orient="records")
    
    def get_point_details(self, point_id: int) -> Dict[str, Any]:

        if point_id not in self.galaxy_df.index:
            return {"error": "Point not found"}
        
        target_point = self.galaxy_df.loc[point_id]
        
        # 🪄 Sécurité : On force la conversion en int et on gère le NaN au cas où
        try:
            target_cluster = int(target_point['cluster']) if pd.notna(target_point['cluster']) else -1
        except (ValueError, TypeError):
            target_cluster = -1
            
        target_topic = target_point['topic']

        # TOP related phrases
        # 🪄 Sécurité ici aussi : On s'assure de filtrer correctement les types
        if target_cluster != -1:
            cluster_df = self.galaxy_df[self.galaxy_df['cluster'].astype(float).astype(int) == target_cluster]
        else:
            cluster_df = self.galaxy_df[self.galaxy_df['topic'] == target_topic]

        # Si le filtre n'a rien renvoyé par sécurité, on prend le topic global
        if cluster_df.empty:
            cluster_df = self.galaxy_df[self.galaxy_df['topic'] == target_topic]

        phrases_list = []
        for idx, row in cluster_df.head(6).iterrows():
            dist = float(((row['x'] - target_point['x'])**2 + (row['y'] - target_point['y'])**2 + (row['z'] - target_point['z'])**2)**0.5)
            score = max(1, min(100, int(100 / (1 + dist))))
            phrases_list.append({
                "phrase": row['phrase'],  
                "score": score
            })
        phrases_list = sorted(phrases_list, key=lambda x: x['score'], reverse=True)

        # Model attribution
        model_counts = cluster_df['model'].value_counts()
        total_models = len(cluster_df) if len(cluster_df) > 0 else 1 # Évite la division par zéro
        model_list = []
        for model_name, count in model_counts.items():
            model_list.append({
                "name": str(model_name),
                "percentage": int((count / total_models * 100))
            })

        # Nearest neighbors
        topic_counts = cluster_df['topic'].value_counts()
        total_topics = len(cluster_df) if len(cluster_df) > 0 else 1 # Évite la division par zéro
        neighbors_list = []
        for topic_name, count in topic_counts.items():
            neighbors_list.append({
                "name": f"Cluster {target_cluster} ({topic_name})" if target_cluster != -1 else str(topic_name),
                "percentage": int((count / total_topics) * 100)
            })
        
        return {
            "phrases": phrases_list,
            "models": model_list,
            "neighbors": neighbors_list
        }



