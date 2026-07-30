import { getColorFromString } from "../utils/colors";

export interface DashboardStats {
    total_dataset_scanned: number;
    total_embedded_phrases: number;
}

// 🆕 Interface pour la réponse de l'overview de diversité
export interface DiversityOverview {
    avg_hsd: number;
    avg_vs: number;
    global_cd: number;
    total_topics: number;
    total_points: number;
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
        const filtersRes = await fetch(`${API_BASE_URL}/api/meta`);
        const pointsRes = await fetch(`${API_BASE_URL}/api/points`);

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

        const settings: FilterItem[] = rawFilters.settings.map(name => ({
            name,
            color: getColorFromString(name),
            active: true
        }));

        const stats = rawFilters.stats;

        return { models, topics, settings, points, stats };
    } catch(error) {
        console.error("Erreur API:", error);
        throw error;
    }
};

// 🆕 Fonction pour récupérer les métriques dynamiques (Ticket #57)
export const fetchDiversityOverview = async (
    models?: string[],
    topics?: string[],
    settings?: string[]
): Promise<DiversityOverview> => {
    try {
        const params = new URLSearchParams();
        models?.forEach(m => params.append("models", m));
        topics?.forEach(t => params.append("topics", t));
        settings?.forEach(s => params.append("settings", s));

        const response = await fetch(`${API_BASE_URL}/api/diversity-overview?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Error fetching diversity overview (Status: ${response.status})`);
        }

        return await response.json();
    } catch (error) {
        console.error("API error fetching diversity overview:", error);
        throw error;
    }
};

export const fetchPointDetails = async (pointId: number): Promise<PointDetailsResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/points/${pointId}/details`);

        if (!response.ok) {
            throw new Error(`Erreur lors de la récupération des détails (Status: ${response.status})`);
        }

        return await response.json();
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

        return await response.json();
    } catch (error) {
        console.error(`API error fetching the point source text ${pointId}:`, error);
        throw error;
    }
};