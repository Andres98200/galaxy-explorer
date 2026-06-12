import { useState } from 'react'
import { type FilterItem } from '../services/api'

interface SideBarFiltersProps {
  models: FilterItem[];
  setModels: React.Dispatch<React.SetStateAction<FilterItem[]>>;
  topics: FilterItem[];
  setTopics: React.Dispatch<React.SetStateAction<FilterItem[]>>;
}

export default function SidebarFilters({models, setModels, topics, setTopics}: SideBarFiltersProps) {
  const [isOpenModels, setOpenModels] = useState(false);
  const [isOpenTopics, setOpenTopics] = useState(false);

  const toggleModel = (name: string) => {
    setModels(prev => prev.map(m => m.name === name ? {...m, active: !m.active } : m ));
  };

  const toggleTopic = (name: string) => {
    setTopics(prev => prev.map(t => t.name === name ? {...t, active: !t.active } : t ));
  };

  return (
    <aside className="sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="logo">LOGO INCOMING</div>
        
      {/* SECTION MODÈLES */}
      <div className="filter-group">
        <h3>Select LLM model</h3>
        <div className="select-box" onClick={() => setOpenModels(!isOpenModels)}>
          <div className="selected-tags">
            {models.filter(m => m.active).map(m => (
              /* Retrait du background color forcé sur la ligne */
              <div key={m.name} className="tag" style={{ '--tag-color': m.color } as React.CSSProperties}>
                <span className="color-indicator" style={{ backgroundColor: m.color }}></span>
                
                {/* Le texte est enveloppé ici pour couper si c'est trop long */}
                <span className="tag-text" onClick={(e) => {
                  e.stopPropagation();
                  toggleModel(m.name);
                }}>
                  {m.name}
                </span>
                
                <span className="close-tag material-symbols-outlined" onClick={(e) => {
                  e.stopPropagation();
                  toggleModel(m.name);
                }}>
                  close_small
                </span>
              </div>
            ))}
          </div>
          <span className={`drop-down-arrow material-symbols-outlined ${isOpenModels ? 'open' : ''}`}>
            keyboard_arrow_down
          </span>
        </div>
        
        {isOpenModels && (
            <div className="dropdown-content">
                <button className="btn-select-all" onClick={() => setModels(prev => prev.map(m => ({...m, active: true})))}>
                  Select All
                </button>
                <div className="available-tags-pool">
                {models.filter(m => !m.active).map(m => (
                    <div key={m.name} className="tag-pill" onClick={() => toggleModel(m.name)}>
                      <span className="color-indicator" style={{ backgroundColor: m.color }}></span>
                      <span className="tag-text">{m.name}</span>
                    </div>
                ))}
                </div>
            </div>
        )}
      </div>

      {/* SECTION TOPICS */}
      <div className="filter-group">
        <h3>Select Topic</h3>
        <div className="select-box" onClick={() => setOpenTopics(!isOpenTopics)}>
          <div className="selected-tags">
            {topics.filter(t => t.active).map(t => (
              <div key={t.name} className="tag" style={{ '--tag-color': t.color } as React.CSSProperties}>
                <span className="color-indicator" style={{ backgroundColor: t.color }}></span>
                
                <span className="tag-text" onClick={(e) => {
                  e.stopPropagation();
                  toggleTopic(t.name);
                }}>
                  {t.name}
                </span>
                
                <span className="close-tag material-symbols-outlined" onClick={(e) => {
                  e.stopPropagation();
                  toggleTopic(t.name);
                }}>
                  close_small
                </span>
              </div>
            ))}
          </div>
          <span className={`drop-down-arrow material-symbols-outlined ${isOpenTopics ? 'open' : ''}`}>
            keyboard_arrow_down
          </span>
        </div>

        {isOpenTopics && (
        <div className="dropdown-content">
            <button className="btn-select-all" onClick={() => setTopics(prev => prev.map(t => ({...t, active: true})))}>
              Select All
            </button>
            <div className="available-tags-pool">
                {topics.filter(t => !t.active).map(t => (
                <div key={t.name} className="tag-pill" onClick={() => toggleTopic(t.name)}>
                  <span className="color-indicator" style={{ backgroundColor: t.color }}></span>
                  <span className="tag-text">{t.name}</span>
                </div>
            ))}
            </div>
        </div>
        )}
      </div>
    </aside>
  )
}