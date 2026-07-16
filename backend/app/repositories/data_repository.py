import sqlite3
import time
from typing import List, Dict, Any, Optional
import pandas as pd

class DataRepository:
    def __init__(self):
        self.db_path = "galaxy_explorer.db"
        print("🌌 Connexion à la base SQLite (Démarrage instantané)...")
        
        start_load = time.time()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT model FROM galaxy_points WHERE model IS NOT NULL")
        self.cached_models = [r[0] for r in cursor.fetchall()]
        
        cursor.execute("SELECT DISTINCT topic FROM galaxy_points WHERE topic IS NOT NULL")
        self.cached_topics = [r[0] for r in cursor.fetchall()]

        # 🆕 Récupération et mise en cache des settings uniques au démarrage
        cursor.execute("SELECT DISTINCT setting FROM galaxy_points WHERE setting IS NOT NULL")
        self.cached_settings = [r[0] for r in cursor.fetchall()]
        
        cursor.execute("SELECT COUNT(*) FROM galaxy_points")
        self.total_cached_points = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"🎉 TOTAL CACHE INITIALIZATION TIME: {time.time() - start_load:.4f} seconds.\n")

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_metadata_options(self) -> Dict[str, Any]:
        return {
            "models": sorted(self.cached_models),
            "topics": sorted(self.cached_topics),
            "settings": sorted(self.cached_settings), # 🆕 Renvoyé à l'API Meta
            "stats": {
                "total_dataset_scanned": 4000000,
                "total_embedded_phrases": self.total_cached_points
            }    
        }
        
    def get_filtered_points(
        self, 
        selected_models: Optional[List[str]], 
        selected_topics: Optional[List[str]],
        selected_settings: Optional[List[str]] = None # 🆕 Paramètre optionnel ajouté
    ) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # 🆕 'setting' est maintenant inclus dans le SELECT
        query = "SELECT id, phrase, topic, model, cluster, prompt_index, x, y, z, setting FROM galaxy_points WHERE 1=1"
        params = []
        
        if selected_models:
            query += f" AND model IN ({','.join(['?'] * len(selected_models))})"
            params.extend(selected_models)
        if selected_topics:
            query += f" AND topic IN ({','.join(['?'] * len(selected_topics))})"
            params.extend(selected_topics)
        # 🆕 Filtrage SQL direct par setting (ift / rag)
        if selected_settings:
            query += f" AND setting IN ({','.join(['?'] * len(selected_settings))})"
            params.extend(selected_settings)
            
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        points = [dict(r) for r in rows]
        for p in points:
            p['cluster'] = int(p['cluster']) if p['cluster'] is not None else -1
        return points
    
    def get_point_details(self, point_id: int) -> Dict[str, Any]:
        global_start = time.time()
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM galaxy_points WHERE id = ?", (point_id,))
        target_row = cursor.fetchone()
        if not target_row:
            conn.close()
            return {"error": "Point not found"}
        
        target_point = dict(target_row)
        target_topic = target_point['topic']

        cursor.execute("SELECT x, y, z, phrase, model FROM galaxy_points WHERE topic = ?", (target_topic,))
        cluster_rows = cursor.fetchall()
        
        cluster_df = pd.DataFrame([dict(r) for r in cluster_rows])
        
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

        model_counts = cluster_df['model'].value_counts()
        total_models = len(cluster_df) if len(cluster_df) > 0 else 1
        model_list = [{"name": str(m), "percentage": int(c / total_models * 100)} for m, c in model_counts.items()]

        # 🏎️ Optimisation SQL pour la recherche des voisins (Évite de saturer la RAM)
        cursor.execute(
            """
            SELECT id, topic, 
                   ((x - ?) * (x - ?) + (y - ?) * (y - ?) + (z - ?) * (z - ?)) AS dist_sq
            FROM galaxy_points
            WHERE id != ?
            ORDER BY dist_sq ASC
            LIMIT 5
            """,
            (target_point['x'], target_point['x'], target_point['y'], target_point['y'], target_point['z'], target_point['z'], point_id)
        )
        closest_rows = cursor.fetchall()
        conn.close()
        
        formatted_neighbors = []
        for row in closest_rows:
            dist = row['dist_sq'] ** 0.5
            score_visuel = max(1, min(100, int(100 / (1 + dist))))
            formatted_neighbors.append({
                "name": f"Neighbor : {row['id']} ({row['topic']})",
                "percentage": score_visuel
            })

        print(f"🚀 [Details API] TOTAL EXECUTION TIME: {time.time() - global_start:.4f} seconds.\n")
        return {"phrases": phrases_list, "models": model_list, "neighbors": formatted_neighbors}
    
    def get_points_source_text(self, point_id: int) -> Dict[str, Any]:
        global_start = time.time()
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT topic, model, prompt_index FROM galaxy_points WHERE id = ?", (point_id,))
        point_row = cursor.fetchone()
        
        if not point_row:
            conn.close()
            return {"error": "Point not found"}
            
        point = dict(point_row)
        
        target_topic = str(point['topic']).strip().lower()
        target_prompt_index = int(point['prompt_index'])
        model_short = str(point['model']).split('/')[-1].strip().lower()
        
        cursor.execute(
            """
            SELECT user_prompt, text 
            FROM responses 
            WHERE LOWER(TRIM(topic)) = ? 
              AND prompt_index = ?
              AND (LOWER(model_id) LIKE ? OR LOWER(model_id) = ?)
            ORDER BY LENGTH(user_prompt) DESC
            LIMIT 1
            """,
            (target_topic, target_prompt_index, f"%{model_short}%", model_short)
        )
        match_row = cursor.fetchone()
        conn.close()
        
        if match_row:
            match_data = dict(match_row)
            print(f"🚀 [Source-Text API] TOTAL EXECUTION TIME: {time.time() - global_start:.4f} seconds.\n")
            return {
                "model": str(point['model']),
                "topic": str(point['topic']),
                "original_prompt": match_data["user_prompt"], 
                "full_response": match_data["text"]           
            }
                
        print(f"❌ [Source-Text API] Text context not found.\n")
        return {"error": "Text context not found"}