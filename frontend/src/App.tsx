import { useEffect, useMemo, useState } from 'react'
import StatCard from './components/StatCard'
import './App.css'
import SideBarFilters from './components/sideBarFilters'
import { 
  fetchDashboardData, 
  fetchDiversityOverview, 
  fetchDiversityMatrix, 
  type FilterItem, 
  type GalaxyPoints, 
  type DiversityOverview, 
  type DiversityMatrixRow 
} from '../src/services/api.ts'
import GalaxyCanvas from './components/galaxyCanvas.tsx'
import SideBarFilterSkeleton from './components/Skeletons/SideBarSkeleton.tsx'
import StatCardSkeleton from './components/Skeletons/StatCardSkeleton.tsx'
import DiversityModal from './components/diversityModal.tsx'

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

  // Métriques de diversité (HSD, VS, CD)
  const [diversity, setDiversity] = useState<DiversityOverview>({
    avg_hsd: 0,
    avg_vs: 0,
    global_cd: 0,
    total_topics: 0,
    total_points: 0
  });

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [matrixData, setMatrixData] = useState<DiversityMatrixRow[]>([]);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [globalStats, setGlobalStats] = useState({ totalScanned: 0, totalPhrases: 0 });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  // Initialisation du tableau de bord
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
        setError("Impossible to fetch the data");
        setLoading(false);
      });
  }, []);

  // Extraction des filtres actifs
  const activeModelNames = useMemo(() => models.filter(m => m.active).map(m => m.name), [models]);
  const activeTopicNames = useMemo(() => topics.filter(t => t.active).map(t => t.name), [topics]);
  const activeSettingNames = useMemo(() => settings.filter(s => s.active).map(s => s.name), [settings]);

  // Listes complètes pour le modal
  const availableModelNames = useMemo(() => models.map(m => m.name), [models]);
  const availableSettingNames = useMemo(() => settings.map(s => s.name), [settings]);
  const availableTopicNames = useMemo(() => topics.map(t => t.name), [topics]);

  // Mise à jour dynamique des cartes lors d'un changement de filtres
  useEffect(() => {
    if (loading) return;

    fetchDiversityOverview(activeModelNames, activeTopicNames, activeSettingNames)
      .then((data) => setDiversity(data))
      .catch((err) => console.error("Error fetching overview metrics:", err));
  }, [activeModelNames, activeTopicNames, activeSettingNames, loading]);

  const handleOpenDiversityModal = async () => {
    setIsLoadingMatrix(true);
    try {
      const data = await fetchDiversityMatrix();
      setMatrixData(data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Error fetching matrix data:", err);
    } finally {
      setIsLoadingMatrix(false);
    }
  };

  const handleSaveFiltersFromModal = (
    selectedModels: string[],
    selectedSettings: string[],
    selectedTopics: string[]
  ) => {
    setModels(prev => prev.map(m => ({ ...m, active: selectedModels.includes(m.name) })));
    setSettings(prev => prev.map(s => ({ ...s, active: selectedSettings.includes(s.name) })));
    setTopics(prev => prev.map(t => ({ ...t, active: selectedTopics.includes(t.name) })));
  };

  // 🎯 Sélectionne uniquement le modèle de la ligne cliquée et ferme le modal
  const handleSelectModelRow = (row: DiversityMatrixRow) => {
    setModels(prev => prev.map(m => ({ ...m, active: m.name === row.model })));
      if (row.setting) setSettings(prev => prev.map(s => ({ ...s, active: s.name === row.setting })));
      if (row.topic) setTopics(prev => prev.map(t => ({ ...t, active: t.name === row.topic })));
    setIsModalOpen(false);
  };

  // Filtrage des points pour la 3D
  const filteredPoints = useMemo(() => {
    return points.filter(point => 
      activeModelNames.includes(point.model) && 
      activeTopicNames.includes(point.topic) &&
      activeSettingNames.includes(point.setting)
    );
  }, [points, activeModelNames, activeTopicNames, activeSettingNames]);

  // Cartes mises à jour avec les métriques calculées
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
        value: formatCompactNumber(filteredPoints.length), 
        icon: 'description', 
        iconColor: '#059669' 
      },
      { 
        title: 'MODELS', 
        value: activeModelNames.length, 
        icon: 'robot_2', 
        iconColor: '#7C3AED' 
      },
      { 
        title: 'TOPICS', 
        value: activeTopicNames.length,
        icon: 'lab_research', 
        iconColor: '#D97706' 
      },
      { 
        title: 'HSD', 
        value: diversity.avg_hsd.toFixed(2), 
        icon: 'hub', 
        iconColor: '#EC4899',
        tooltip: 'Hill-Shannon Diversity - Averaged across active topics'
      },
      { 
        title: 'VS', 
        value: diversity.avg_vs.toFixed(2), 
        icon: 'insights', 
        iconColor: '#8B5CF6',
        tooltip: 'Spectral Diversity averaged across active topics'
      },
      { 
        title: 'CD', 
        value: diversity.global_cd.toFixed(3), 
        icon: 'straighten', 
        iconColor: '#10B981',
        tooltip: 'Global Cosine Distance across all displayed claims'
      }
    ];
  }, [globalStats, activeModelNames, activeTopicNames, filteredPoints.length, diversity]);

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
          <SideBarFilterSkeleton/>
        ) : (
          <>
            <SideBarFilters 
              models={models}
              setModels={setModels}
              topics={topics}
              setTopics={setTopics}
              settings={settings}
              setSettings={setSettings}
              onOpenDiversityModal={handleOpenDiversityModal}
              isLoadingMatrix={isLoadingMatrix}
            />
          </>
        )}
      </aside>

      <main className="main-content">

        <div className="stats-row">
          {loading ? (
            Array.from({ length: 7 }).map((_, index) => (
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
                tootlip={stat.tooltip}
              />
            ))
          )}
        </div>

        <div className="content-grid">
          <GalaxyCanvas points={filteredPoints} topics={topics} />
        </div>
      </main>

      <DiversityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        matrixData={matrixData}
        availableModels={availableModelNames}
        availableSettings={availableSettingNames}
        availableTopics={availableTopicNames}
        onSaveFilters={handleSaveFiltersFromModal}
        onSelectModelRow={handleSelectModelRow}
      />
    </div>
  );
}