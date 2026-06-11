import { useEffect, useMemo, useState } from 'react'
import StatCard from './components/StatCard'
import './App.css'
import SideBarFilters from './components/sideBarFilters'
import { fetchDashboardData, type FilterItem, type GalaxyPoints } from '../src/services/api.ts'
import GalaxyCanvas from './components/galaxyCanvas.tsx'

export default function App() {

  const [models, setModels] = useState<FilterItem[]>([]);
  const [topics, setTopics] = useState<FilterItem[]>([]);
  const [points, SetPoints] = useState<GalaxyPoints[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // Remplacement de String par string (meilleure pratique TS)

  // Conserve tes stats globales du backend
  const [globalStats, setGlobalStats] = useState({ totalScanned: 0, totalPhrases: 0 });

  useEffect(() => {
    fetchDashboardData()
      .then((data) => {
        setModels(data.models);
        setTopics(data.topics);
        SetPoints(data.points);

        if (data.stats) {
          setGlobalStats({
            totalPhrases: data.stats.total_embedded_phrases,
            totalScanned: data.stats.total_dataset_scanned
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossible to feth the data");
        setLoading(false);
      });
  }, []);

  // Extraction des filtres actifs
  const activeModelNames = useMemo(() => models.filter(m => m.active).map(m => m.name), [models]);
  const activeTopicNames = useMemo(() => topics.filter(t => t.active).map(t => t.name), [topics]);

  // Filtrage des points pour la 3D
  const filteredPoints = useMemo(() => {
    return points.filter(point => 
      activeModelNames.includes(point.model) && activeTopicNames.includes(point.topic)
    );
  }, [points, activeModelNames, activeTopicNames]);

  const dynamicStats = useMemo(() => {
    return [
      { 
        title: 'Total Scanned', 
        value: globalStats.totalScanned.toLocaleString(),
        icon: 'analytics', 
        iconColor: '#4F46E5' 
      },
      { 
        title: 'Total Embedded', 
        value: globalStats.totalPhrases.toLocaleString(), 
        icon: 'data_usage', 
        iconColor: '#0EA5E9' 
      },
      { 
        title: 'Active Models', 
        value: models.length, 
        icon: 'cognition_2', 
        iconColor: '#16A34A' 
      },
      { 
        title: 'Visible Phrases', 
        value: filteredPoints.length,
        icon: 'article', 
        iconColor: '#B700FF' 
      }
    ];
  }, [globalStats, models, filteredPoints.length]);

  if (loading) {
    return ( 
      <div className="fetching-card">
        <div className='fetch-icon-wrapper'>
          <span className='material-symbols-outlined spin-animation'>directory_sync</span>
        </div>
        <span className="fetch-text-container">
          <h3 className='fetch-title'>Fetching the galaxy Data</h3>
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stat-error-card">
        <div className='error-icon-wrapper'>
          <span className="material-symbols-outlined">warning</span>
        </div>

        <div className='error-text-container'>
          <h3 className="error-title">Error fetching the galaxy data</h3>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">

      <aside className="sidebar-placeholder">
        <SideBarFilters 
          models={models}
          setModels={setModels}
          topics={topics}
          setTopics={setTopics}
        />
      </aside>

      <main className="main-content">

        <div className="stats-row">
          {dynamicStats.map((stat, index) => (
            <StatCard 
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              iconColor={stat.iconColor}
            />
          ))}
        </div>

        <div className="content-grid">
          <GalaxyCanvas points={filteredPoints} topics={topics} />
        </div>

      </main>
    </div>
  );
}