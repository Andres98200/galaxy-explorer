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
    setModels(prev => prev.map(m => m.name === name ? {...m, active: !m.active } : m )
  );
};

    const toggleTopic = (name: string) => {
    setTopics(prev => prev.map(t => t.name === name ? {...t, active: !t.active } : t )
  );
};


  return (

    <aside className="sidebar">
        <div className="logo">LOGO INCOMING</div>
      {/* SECTION MODÈLES */}
      <div className="filter-group">
        <h3>Select LLM model</h3>
        <div className="select-box" onClick={()=> setOpenModels(!isOpenModels)}>
          <div className="selected-tags">
            {models.filter(m => m.active).map(m => (
              <span key={m.name} className="tag" 
                    style={{ backgroundColor: m.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleModel(m.name)
                    }}
              >
                {m.name} 
                <span className="close-tag material-symbols-outlined">close_small</span>
              </span>
            ))}
          </div>
          <span className=" drop-down-arrow material-symbols-outlined">keyboard_arrow_down</span>
        </div>
        
        {isOpenModels && (
            <div className="dropdown-content">
                <button className="btn-select-all" onClick={() => setModels(prev => prev.map(m => ({...m, active: true})))}>
                  Select All
                </button>
                <div className="available-tags-pool">
                {models.filter(m => !m.active).map(m => (
                    <span key={m.name} 
                          className="tag-pill" 
                          style={{ backgroundColor: m.color}}
                          onClick={() => toggleModel(m.name)}
                    >
                    {m.name}
                    </span>
                ))}
                </div>
            </div>
        )}
        </div>

      {/* SECTION TOPICS */}
      <div className="filter-group">
        <h3>Select Topic</h3>
        <div className="select-box" onClick={() => setOpenTopics(!isOpenTopics) }>
          <div className="selected-tags">
            {topics.filter(t => t.active).map(t => (
              <span key={t.name} 
                    className="tag" 
                    style={{ backgroundColor: t.color }}
                     onClick={(e) => {
                      e.stopPropagation();
                      toggleTopic(t.name)
                     }}
                    >
                {t.name} <span className="close-tag material-symbols-outlined">close_small</span>
              </span>
            ))}
          </div>
          <span className="drop-down-arrow material-symbols-outlined">keyboard_arrow_down</span>
        </div>

        {isOpenTopics && (
        <div className="dropdown-content">
            <button className="btn-select-all" onClick={() => setTopics(prev => prev.map(t => ({...t, active: true})))}>
              Select All
              </button>
                <div className="available-tags-pool">
                {topics.filter(t => !t.active).map(t => (
                <span key={t.name} 
                      className="tag-pill" 
                      style={{ backgroundColor: t.color}}
                      onClick={()=> toggleTopic(t.name)}
                      >
                {t.name}
                </span>
            ))}
            </div>
        </div>
        )}
      </div>
    </aside>
  )
}