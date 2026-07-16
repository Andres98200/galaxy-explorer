import { getColorFromString } from "../utils/colors";

export interface DashboardStats {
    total_dataset_scanned: number;
    total_embedded_phrases: number;
}

export interface RawDashboardFilters {
    models: string[];
    topics: string[];
    stats: DashboardStats;
    settings: string[];
}

export interface GalaxyPoints {
    id: number;
    phrase: string;
    topic: string;
    model: string;
    cluster: number;
    x: number;
    y: number;
    z: number;
    setting: string;
}

export interface FilterItem {
    name: string;
    color: string;
    active: boolean;
}

export interface ModelBar {
    name: string;
    percentage: number;
}

export interface ClusterBar {
    name: string;
    percentage: number;
}

export interface PhraseItem {
    phrase: string;
    score: number;
}

export interface PointDetailsResponse {
    phrases: PhraseItem[];
    models: ModelBar[];
    neighbors: ClusterBar[];
}

export interface SourceTextData {
    model: string;
    topic: string;
    original_prompt: string;
    full_response: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchDashboardData = async () => {
    try {
        const filtersRes = await fetch(`${API_BASE_URL}/api/meta`)
        const pointsRes = await fetch(`${API_BASE_URL}/api/points`)

        if (!filtersRes.ok) {
            throw new Error(`Error requesting metadata (Status: ${filtersRes.status})`);
        }
        if (!pointsRes.ok) {
            throw new Error(`Error requesting galaxy points (Status: ${pointsRes.status})`);
        }

        const rawFilters: RawDashboardFilters = await filtersRes.json();
        const points: GalaxyPoints[] = await pointsRes.json();

        const models: FilterItem[] = rawFilters.models.map(name => ({
            name,
            color: getColorFromString(name),
            active: true
        }));

        const topics: FilterItem[] = rawFilters.topics.map(name => ({
            name,
            color: getColorFromString(name),
            active: true
        }));

        // 🆕 Transformation des settings pour ton interface de filtres
        const settings: FilterItem[] = rawFilters.settings.map(name => ({
            name,
            color: getColorFromString(name), // Donne une couleur unique ou une couleur fixe
            active: true
        }));

        const stats = rawFilters.stats;

        // 🆕 On retourne également les 'settings' au composant React !
        return { models, topics, settings, points, stats };
    } catch(error) {
        console.error("Erreur API:", error)
        throw error;
    }
};

export const fetchPointDetails = async (pointId: number): Promise<PointDetailsResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/points/${pointId}/details`);

        if (!response.ok) {
            throw new Error(`Erreur lors de la récupération des détails (Status: ${response.status})`);
        }

        const data: PointDetailsResponse = await response.json();
        return data;
    } catch (error) {
        console.error(`Erreur API sur les détails du point ${pointId}:`, error);
        throw error;
    }
};

export const fetchSourceTextData = async (pointId: number): Promise<SourceTextData> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/points/${pointId}/source-text`);

        if (!response.ok) {
            throw new Error(`Error requesting the point source text (Status: ${response.status})`);
        }

        const data: SourceTextData = await response.json();
        return data;
    } catch (error) {
        console.error(`API error fetching the point source text ${pointId}:`, error);
        throw error;
    }
}