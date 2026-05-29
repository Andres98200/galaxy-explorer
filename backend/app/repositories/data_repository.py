from typing import List, Dict, Any, Optional
from datasets import load_dataset 
from sklearn.manifold import TSNE 
from llm_knowledge.epistemic_diversity import embed_sentences
import pandas as pd

class DataRepository:
    def __init__(self):
        print("Connexion to Hugging Face API")
        dataset = load_dataset('dwright37/llm-knowledge-collapse', 'clusters', streaming=True)
        
        print("Type du dataset :", type(dataset))

        print("Collecting all the topics", )

        phrases = []
        topics = []
        models = []
        clusters = []

        count_data = {}
        MAX_PHRASES_PER_TOPIC = 25
        MAX_LINES_TO_SCAN = 5000000  
        total_scanned = 0

        for line in dataset['clusters']:
            total_scanned += 1
            
            # Petit indicateur visuel pour voir que ça avance
            if total_scanned % 2000 == 0:
                print(f"Lignes scannées : {total_scanned}...")

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

            # Si on a atteint notre limite de scan, on coupe !
            if total_scanned >= MAX_LINES_TO_SCAN:
                print(f"✋ Limite de sécurité atteinte ({MAX_LINES_TO_SCAN} lignes). Arrêt du scan.")
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

    def get_metadata_options(self) -> Dict[str, List[str]]:
            return {
                "models":sorted(self.galaxy_df['model'].unique().tolist()),
                "topics":sorted(self.galaxy_df['topic'].unique().tolist()),   
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




