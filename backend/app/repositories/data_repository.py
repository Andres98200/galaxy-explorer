import os
import sqlite3
import time
import pandas as pd
import numpy as np
from collections import Counter
from scipy.stats import entropy
from typing import List, Dict, Any, Optional

DB_FILE = os.path.join("data", "galaxy_explorer.db")

class DataRepository:
    def __init__(self, db_path: str = DB_FILE):
        self.db_path = db_path
        print("Connection to the SQLite database")
        
        start_load = time.time()
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT model FROM galaxy_points WHERE model IS NOT NULL AND model != ''")
        self.cached_models = [r[0] for r in cursor.fetchall()]
        
        cursor.execute("SELECT DISTINCT topic FROM galaxy_points WHERE topic IS NOT NULL AND topic != ''")
        self.cached_topics = [r[0] for r in cursor.fetchall()]

        cursor.execute("SELECT DISTINCT setting FROM galaxy_points WHERE setting IS NOT NULL AND setting != ''")
        self.cached_settings = [r[0] for r in cursor.fetchall()]
        
        cursor.execute("SELECT COUNT(*) FROM galaxy_points")
        self.total_cached_points = cursor.fetchone()[0]
        
        conn.close()
        print(f"TOTAL CACHE INITIALIZATION TIME: {time.time() - start_load:.4f} seconds.\n")

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_metadata_options(self) -> Dict[str, Any]:
        return {
            "models": sorted(self.cached_models),
            "topics": sorted(self.cached_topics),
            "settings": sorted(self.cached_settings),
            "stats": {
                "total_dataset_scanned": self.total_cached_points,
                "total_embedded_phrases": self.total_cached_points
            }    
        }

    def get_filtered_points(
        self, 
        selected_models: Optional[List[str]] = None, 
        selected_topics: Optional[List[str]] = None,
        selected_settings: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query = "SELECT id, phrase, topic, model, cluster, prompt_index, x, y, z, setting FROM galaxy_points WHERE 1=1"
        params = []
        
        if selected_models:
            query += f" AND model IN ({','.join(['?'] * len(selected_models))})"
            params.extend(selected_models)
        if selected_topics:
            query += f" AND topic IN ({','.join(['?'] * len(selected_topics))})"
            params.extend(selected_topics)
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

        print(f"[API Details] TOTAL EXECUTION TIME: {time.time() - global_start:.4f} seconds.\n")
        return {"phrases": phrases_list, "models": model_list, "neighbors": formatted_neighbors}

    def get_points_source_text(self, point_id: int) -> Dict[str, Any]:
        global_start = time.time()
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT topic, model, prompt_index, setting FROM galaxy_points WHERE id = ?", (point_id,))
        point_row = cursor.fetchone()
        
        if not point_row:
            conn.close()
            return {"error": "Point not found"}
            
        point = dict(point_row)
        
        cursor.execute(
            """
            SELECT user_prompt, text 
            FROM responses 
            WHERE topic = ? AND prompt_index = ? AND model_id = ? AND setting = ?
            LIMIT 1
            """,
            (
                str(point['topic']).strip().lower(),
                int(point['prompt_index']),
                str(point['model']).strip().lower(),
                str(point['setting']).strip().lower()
            )
        )
        match_row = cursor.fetchone()
        
        if not match_row:
            cursor.execute(
                """
                SELECT user_prompt, text 
                FROM responses 
                WHERE topic = ? AND prompt_index = ? AND model_id = ?
                LIMIT 1
                """,
                (
                    str(point['topic']).strip().lower(),
                    int(point['prompt_index']),
                    str(point['model']).strip().lower()
                )
            )
            match_row = cursor.fetchone()

        conn.close()
        
        if match_row:
            match_data = dict(match_row)
            print(f"[API Source-Text] TOTAL EXECUTION TIME: {time.time() - global_start:.4f} seconds.\n")
            return {
                "model": str(point['model']),
                "topic": str(point['topic']),
                "setting": str(point['setting']),
                "original_prompt": match_data["user_prompt"], 
                "full_response": match_data["text"]           
            }
                
        print(f"[API Source-Text] Text context not found.\n")
        return {"error": "Text context not found"}

    def _calculate_diversity_from_clusters(self, cluster_list: List[int]) -> float:
        valid_clusters = [c for c in cluster_list if c is not None and c >= 0]
        if not valid_clusters:
            return 0.0

        counts = Counter(valid_clusters)
        total = len(valid_clusters)
        probs = [cnt / total for cnt in counts.values()]

        ent = entropy(probs) if sum(probs) > 0 else 0.0
        hillshannon = np.exp(ent) if ent > 0 else 0.0

        return float(hillshannon)

    def _calculate_vendi_score(self, coords_matrix: np.ndarray) -> float:
        if len(coords_matrix) < 2:
            return 1.0
        
        norms = np.linalg.norm(coords_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1e-10
        normalized = coords_matrix / norms
        
        N = len(normalized)
        K = np.dot(normalized, normalized.T) / N
        
        eigenvalues = np.linalg.eigvalsh(K)
        eigenvalues = eigenvalues[eigenvalues > 1e-10]
        
        ent = -np.sum(eigenvalues * np.log(eigenvalues))
        vs = np.exp(ent)
        return float(vs)

    def get_diversity_overview(
        self, 
        selected_models: Optional[List[str]] = None,
        selected_topics: Optional[List[str]] = None,
        selected_settings: Optional[List[str]] = None
    ) -> Dict[str, float]:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query = "SELECT topic, cluster, x, y, z FROM galaxy_points WHERE 1=1"
        params = []

        if selected_models:
            query += f" AND model IN ({','.join(['?'] * len(selected_models))})"
            params.extend(selected_models)
        if selected_topics:
            query += f" AND topic IN ({','.join(['?'] * len(selected_topics))})"
            params.extend(selected_topics)
        if selected_settings:
            query += f" AND setting IN ({','.join(['?'] * len(selected_settings))})"
            params.extend(selected_settings)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return {
                "avg_hsd": 0.0, 
                "avg_vs": 0.0, 
                "global_cd": 0.0, 
                "total_topics": 0, 
                "total_points": 0
            }

        df = pd.DataFrame([dict(r) for r in rows])

        topic_hsd_scores = []
        topic_vs_scores = []

        for topic_name, group in df.groupby("topic"):
            valid_clusters = group[group["cluster"] >= 0]["cluster"].tolist()
            if valid_clusters:
                hsd_val = self._calculate_diversity_from_clusters(valid_clusters)
                if hsd_val > 0:
                    topic_hsd_scores.append(hsd_val)

            topic_coords = group[["x", "y", "z"]].to_numpy()
            if len(topic_coords) > 1:
                vs_val = self._calculate_vendi_score(topic_coords)
                topic_vs_scores.append(vs_val)

        avg_hsd = float(np.mean(topic_hsd_scores)) if topic_hsd_scores else 0.0
        avg_vs = float(np.mean(topic_vs_scores)) if topic_vs_scores else 0.0

        coords = df[["x", "y", "z"]].to_numpy()
        global_cd = 0.0
        
        if len(coords) > 1:
            if len(coords) > 1000:
                idx = np.random.choice(len(coords), 1000, replace=False)
                sample_coords = coords[idx]
            else:
                sample_coords = coords

            norms = np.linalg.norm(sample_coords, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            normalized = sample_coords / norms
            
            cos_sim_matrix = np.dot(normalized, normalized.T)
            cos_dist_matrix = 1.0 - cos_sim_matrix
            
            triu_indices = np.triu_indices_from(cos_dist_matrix, k=1)
            global_cd = float(np.mean(cos_dist_matrix[triu_indices]))

        return {
            "avg_hsd": round(avg_hsd, 3),
            "avg_vs": round(avg_vs, 3),
            "global_cd": round(global_cd, 3),
            "total_topics": int(df["topic"].nunique()),
            "total_points": len(df)
        }

    def get_diversity_matrix(self) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query = "SELECT model, setting, topic, cluster, x, y, z FROM galaxy_points"
        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return []

        df = pd.DataFrame([dict(r) for r in rows])
        results = []

        grouped = df.groupby(["model", "setting", "topic"])

        for (model, setting, topic), group in grouped:
            valid_clusters = group[group["cluster"] >= 0]["cluster"].tolist()
            hsd_val = self._calculate_diversity_from_clusters(valid_clusters) if valid_clusters else 0.0

            coords = group[["x", "y", "z"]].to_numpy()
            vs_val = self._calculate_vendi_score(coords) if len(coords) > 1 else 1.0

            cd_val = 0.0
            if len(coords) > 1:
                norms = np.linalg.norm(coords, axis=1, keepdims=True)
                norms[norms == 0] = 1e-10
                normalized = coords / norms
                
                cos_sim_matrix = np.dot(normalized, normalized.T)
                cos_dist_matrix = 1.0 - cos_sim_matrix
                
                triu_indices = np.triu_indices_from(cos_dist_matrix, k=1)
                if len(triu_indices[0]) > 0:
                    cd_val = float(np.mean(cos_dist_matrix[triu_indices]))

            results.append({
                "model": model,
                "setting": setting,
                "topic": topic,
                "hsd": round(hsd_val, 3),
                "vs": round(vs_val, 3),
                "cd": round(cd_val, 3)
            })

        return results