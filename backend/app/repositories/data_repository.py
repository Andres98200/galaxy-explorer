import sqlite3
import time
from typing import List, Dict, Any, Optional
import pandas as pd

class DataRepository:
    def __init__(self):
        # On cible le fichier SQLite que tu viens de générer
        self.db_path = "galaxy_explorer.db"
        print("🌌 Connexion à la base SQLite (Démarrage instantané)...")
        
        start_load = time.time()
        
        # Récupération ultra-légère des valeurs uniques pour la sidebar au démarrage
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT model FROM galaxy_points WHERE model IS NOT NULL")
        self.cached_models = [r[0] for r in cursor.fetchall()]
        
        cursor.execute("SELECT DISTINCT topic FROM galaxy_points WHERE topic IS NOT NULL")
        self.cached_topics = [r[0] for r in cursor.fetchall()]
        
        cursor.execute("SELECT COUNT(*) FROM galaxy_points")
        self.total_cached_points = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"🎉 TOTAL CACHE INITIALIZATION TIME: {time.time() - start_load:.4f} seconds.\n")

    def _get_connection(self):
        """Ouvre une connexion et configure RealDictRow pour avoir des dictionnaires Python"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_metadata_options(self) -> Dict[str, Any]:
        """Retourne la liste des modèles et des topics dispo pour les filtres"""
        return {
            "models": sorted(self.cached_models),
            "topics": sorted(self.cached_topics),  
            "stats": {
                "total_dataset_scanned": 4000000,
                "total_embedded_phrases": self.total_cached_points
            }    
        }
        
    def get_filtered_points(self, selected_models: Optional[List[str]], selected_topics: Optional[List[str]]) -> List[Dict[str, Any]]:
        """Retourne les points 3D filtrés par SQLite (fini le filtrage lent en JS ou Pandas)"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        query = "SELECT id, phrase, topic, model, cluster, prompt_index, x, y, z FROM galaxy_points WHERE 1=1"
        params = []
        
        if selected_models:
            query += f" AND model IN ({','.join(['?'] * len(selected_models))})"
            params.extend(selected_models)
        if selected_topics:
            query += f" AND topic IN ({','.join(['?'] * len(selected_topics))})"
            params.extend(selected_topics)
            
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        # Formatage des données pour correspondre à ton Front-End
        points = [dict(r) for r in rows]
        for p in points:
            p['cluster'] = int(p['cluster']) if p['cluster'] is not None else -1
        return points
    
    def get_point_details(self, point_id: int) -> Dict[str, Any]:
        """Calcule les détails d'un point (phrases clés, voisins, répartition)"""
        global_start = time.time()
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # 1. Récupération du point ciblé en O(1)
        cursor.execute("SELECT * FROM galaxy_points WHERE id = ?", (point_id,))
        target_row = cursor.fetchone()
        if not target_row:
            conn.close()
            return {"error": "Point not found"}
        
        target_point = dict(target_row)
        target_topic = target_point['topic']

        # 2. Extraction uniquement du sous-groupe lié au Topic (très rapide grâce à l'index)
        cursor.execute("SELECT x, y, z, phrase, model FROM galaxy_points WHERE topic = ?", (target_topic,))
        cluster_rows = cursor.fetchall()
        
        # Conversion temporaire en DataFrame Pandas juste pour tes calculs mathématiques/statistiques internes
        cluster_df = pd.DataFrame([dict(r) for r in cluster_rows])
        
        # 3. Tri et extraction des phrases clés
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

        # 4. Calcul de la répartition des modèles
        model_counts = cluster_df['model'].value_counts()
        total_models = len(cluster_df) if len(cluster_df) > 0 else 1
        model_list = [{"name": str(m), "percentage": int(c / total_models * 100)} for m, c in model_counts.items()]

        # 5. Calcul des 5 plus proches voisins géométriques (sur toute la galaxy)
        # Pour éviter de tout charger en RAM, on restreint la recherche aux points proches ou on utilise une requête SQL rapide
        cursor.execute("SELECT id, topic, x, y, z FROM galaxy_points")
        all_points_rows = cursor.fetchall()
        conn.close()
        
        all_df = pd.DataFrame([dict(r) for r in all_points_rows])
        all_df['dist'] = ((all_df['x'] - target_point['x'])**2 + 
                          (all_df['y'] - target_point['y'])**2 + 
                          (all_df['z'] - target_point['z'])**2)**0.5
        
        closest_indices = all_df.nsmallest(6, 'dist')
        
        formatted_neighbors = []
        for idx, row in closest_indices.iterrows():
            if int(row['id']) == point_id:
                continue
            score_visuel = max(1, min(100, int(100 / (1 + row['dist']))))
            formatted_neighbors.append({
                "name": f"Neighbor : {int(row['id'])} ({row['topic']})",
                "percentage": score_visuel
            })
            if len(formatted_neighbors) >= 5:
                break

        print(f"🚀 [Details API] TOTAL EXECUTION TIME: {time.time() - global_start:.4f} seconds.\n")
        return {"phrases": phrases_list, "models": model_list, "neighbors": formatted_neighbors}
    
    def get_points_source_text(self, point_id: int) -> Dict[str, Any]:
        """
        Récupère le prompt original exact et sa réponse en associant 
        le topic, le prompt_index et une recherche tolérante sur le modèle.
        """
        global_start = time.time()
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # 1. Récupérer les métadonnées exactes du point cliqué
        cursor.execute("SELECT topic, model, prompt_index FROM galaxy_points WHERE id = ?", (point_id,))
        point_row = cursor.fetchone()
        
        if not point_row:
            conn.close()
            return {"error": "Point not found"}
            
        point = dict(point_row)
        
        # Préparation des variables pour la recherche
        target_topic = str(point['topic']).strip().lower()
        target_prompt_index = int(point['prompt_index'])
        # On extrait juste le nom du modèle sans le préfixe (ex: "qwen3-14b")
        model_short = str(point['model']).split('/')[-1].strip().lower()
        
        # 2. Recherche SQL 100% propre (sans EQUAL ou autre syntaxe invalide)
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