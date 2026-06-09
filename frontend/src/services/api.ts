import { getColorFromString } from "../utils/colors";

export interface RawDashboardFilters {
    models: string[];
    topics: string[];
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
}

export interface FilterItem {
    name: string;
    color: string;
    active: boolean;
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

        return { models, topics, points };
    }catch(error){
        console.error("Erreur API:", error)
        throw error;
    }
};