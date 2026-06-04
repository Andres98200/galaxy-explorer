import { useState } from 'react'
import StatCard from './components/StatCard'
import './App.css'
import SideBarFilters from './components/sideBarFilters'

export default function App() {

  const [stats] = useState([
    { title: 'Total Data', value: '124.2 M', icon: 'data_usage', iconColor: '#4F46E5' },
    { title: 'Models', value: '142', icon: 'cognition_2', iconColor: '#16A34A' },
    { title: 'Phrases', value: '14.837', icon: 'article', iconColor: '#B700FF' },
    { title: 'Topics', value: '182', icon: 'topic', iconColor: '#34DA25'}
  ])

  return (
    <div className="dashboard-container">

      <aside className="sidebar-placeholder">
        <SideBarFilters />
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
          <p>Graphic</p>
        </div>

      </main>
    </div>
  )

}
