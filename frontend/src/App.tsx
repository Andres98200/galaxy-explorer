import { useEffect, useState } from 'react'
import StatCard from './components/StatCard'
import './App.css'
import SideBarFilters from './components/sideBarFilters'
import { fetchDashboardData, type FilterItem, type GalaxyPoints } from '../src/services/api.ts'

export default function App() {

    const [stats] = useState([
    { title: 'Total Data', value: '124.2 M', icon: 'data_usage', iconColor: '#4F46E5' },
    { title: 'Models', value: '142', icon: 'cognition_2', iconColor: '#16A34A' },
    { title: 'Phrases', value: '14.837', icon: 'article', iconColor: '#B700FF' },
    { title: 'Topics', value: '182', icon: 'topic', iconColor: '#34DA25'}
  ])

  const [models, setModels] = useState<FilterItem[]>([]);
  const [topics, setTopics] = useState<FilterItem[]>([]);
  const [points, SetPoints] = useState<GalaxyPoints[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<String | null>(null);

  useEffect(() => {
    fetchDashboardData()
      .then((data) => {
        setModels(data.models);
        setTopics(data.topics);
        SetPoints(data.points);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Imposible fetching Data...")
        setLoading(false);
      });
  }, []);

  const activeModelNames = models.filter(m => m.active).map(m => m.name);
  const activeTopicNames = topics.filter(t => t.active).map(t => t.name);

  const filteredPoints = points.filter(point => 
    activeModelNames.includes(point.model) && activeTopicNames.includes(point.topic)
  );

  if(loading) {
    return ( 
      <div className='stat-card'>
        <h3>Fetching the galaxy Data</h3>
      </div>
    );
  }

  if(error) {
    return (
      <div>
        <h3>Error fetching the galaxy data</h3>
        <p>{error}</p>
      </div>

    )
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
          {stats.map((stat, index) => (
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
          {filteredPoints.length}/
          {points.length}/
          {activeModelNames.length}/
          {activeTopicNames.length}
        </div>

      </main>
    </div>
  )

}
