import { useEffect, useMemo, useState } from 'react'
import StatCard from './components/StatCard'
import './App.css'
import SideBarFilters from './components/sideBarFilters'
import { fetchDashboardData, type FilterItem, type GalaxyPoints } from '../src/services/api.ts'
import GalaxyCanvas from './components/galaxyCanvas.tsx'
import SideBarFilterSkeleton from './components/Skeletons/SideBarSkeleton.tsx'
import StatCardSkeleton from './components/Skeletons/StatCardsSkeleton.tsx'

function formatCompactNumber(number: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(number);
}

export default function App() {

  const [models, setModels] = useState<FilterItem[]>([]);
  const [topics, setTopics] = useState<FilterItem[]>([]);
  const [points, SetPoints] = useState<GalaxyPoints[]>([]);
  const [settings, setSettings] = useState<FilterItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [globalStats, setGlobalStats] = useState({ totalScanned: 0, totalPhrases: 0 });

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = () => setIsMenuOpen(false)

  useEffect(() => {
    fetchDashboardData()
      .then((data) => {
        setModels(data.models);
        setTopics(data.topics);
        setSettings(data.settings);
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
  const activeSettingNames = useMemo(() => settings.filter(s => s.active).map(s => s.name), [settings]);

  // Filtrage des points pour la 3D
  const filteredPoints = useMemo(() => {
    return points.filter(point => 
      activeModelNames.includes(point.model) && 
      activeTopicNames.includes(point.topic) &&
      activeSettingNames.includes(point.setting)
    );
  }, [points, activeModelNames, activeTopicNames, activeSettingNames]);

  const dynamicStats = useMemo(() => {
    return [
      { 
        title: 'TOTAL DATA', 
        value: formatCompactNumber(globalStats.totalScanned),
        icon: 'monitoring', 
        iconColor: '#2563EB' 
      },
      { 
        title: 'PHRASES', 
        value: formatCompactNumber(globalStats.totalPhrases), 
        icon: 'description', 
        iconColor: '#059669' 
      },
      { 
        title: 'MODELS', 
        value: models.length, 
        icon: 'robot_2', 
        iconColor: '#7C3AED' 
      },
      { 
        title: 'TOPICS', 
        value: topics.length,
        icon: 'lab_research', 
        iconColor: '#D97706' 
      }
    ];
  }, [globalStats, models, topics.length, filteredPoints.length]);


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

      <button className='burger-menu-btn'
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label='toggle-menu'
              aria-expanded={isMenuOpen}
              >
              <span className='material-symbols-outlined'>
                {isMenuOpen ? "close": "menu"}
              </span>
      </button>

      {isMenuOpen && <div className="sidebar-overlay" onClick={closeMenu} />}

      <aside className={`sidebar-placeholder ${isMenuOpen ? "open": ""}`}>
       {loading ? (
        <SideBarFilterSkeleton />
       ): (
        <SideBarFilters 
          models={models}
          setModels={setModels}
          topics={topics}
          setTopics={setTopics}
          settings={settings}
          setSettings={setSettings}
        />
       )}
      </aside>

      <main className="main-content">

        <div className="stats-row">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))
          ) : (
            dynamicStats.map((stat, index) => (
              <StatCard 
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                iconColor={stat.iconColor}
              />
            ))
          )}
        </div>

        <div className="content-grid">
          <GalaxyCanvas points={filteredPoints} topics={topics} />
        </div>

      </main>
    </div>
  );
}