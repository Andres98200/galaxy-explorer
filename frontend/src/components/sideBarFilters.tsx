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

  const [searchModel, setSearchModel] = useState('');
  const [searchTopic, setSearchTopic] = useState('');

  const toggleModel = (name: string) => {
    setModels(prev => prev.map(m => m.name === name ? {...m, active: !m.active } : m ));
  };

  const toggleTopic = (name: string) => {
    setTopics(prev => prev.map(t => t.name === name ? {...t, active: !t.active } : t ));
  };

  const filteredModelsPool = models
    .filter(m => !m.active)
    .filter(m => m.name.toLowerCase().includes(searchModel.toLowerCase()));

  const filteredTopicsPool = topics
    .filter(t => !t.active)
    .filter(t => t.name.toLowerCase().includes(searchTopic.toLowerCase()));

  return (
    <aside className="sidebar" onClick={(e) => e.stopPropagation()}>
      <div className="logo">LOGO INCOMING</div>
        
      {/* SECTION MODÈLES */}
      <div className="filter-group">
        <h3>Select LLM model</h3>
        
        <div className="select-box" onClick={() => !isOpenModels && setOpenModels(true)}>
          <div className="selected-tags">
            
            {models.filter(m => m.active).map(m => (
              <div key={m.name} className="tag" title={m.name} style={{ '--tag-color': m.color } as React.CSSProperties}>
                <span className="color-indicator" style={{ backgroundColor: m.color }}></span>
                <span className="tag-text" onClick={(e) => { e.stopPropagation(); toggleModel(m.name); }}>
                  {m.name}
                </span>
                <span className="close-tag material-symbols-outlined" onClick={(e) => { e.stopPropagation(); toggleModel(m.name); }}>
                  close_small
                </span>
              </div>
            ))}

              <input 
                type="text"
                className="search-input"
                placeholder={models.filter(m => m.active).length > 0 ? "" : "ChatGPT, Qwen..."}
                value={searchModel}
                autoFocus
                onChange={(e) => setSearchModel(e.target.value)}
              />
          </div>

          <div className='filter-buttons'>
            <span 
              className="material-symbols-outlined close-research"
              onClick={(e) => {
                e.stopPropagation();
                if (isOpenModels) {
                  setOpenModels(false);
                  setSearchModel('');
                } else if (models.some(m => m.active)) {
                  setModels(prev => prev.map(m => ({...m, active: false})));
                } else {
                  setOpenModels(true);
                }
              }}
            >
              {isOpenModels ? 'close' : models.some(m => m.active) ? 'cancel' : 'search'}
            </span>
          </div>
        </div>
        
        {isOpenModels && (
            <div className="dropdown-content">
                <button className="btn-select-all" onClick={() => setModels(prev => prev.map(m => ({...m, active: true})))}>
                  Select All
                </button>
                <div className="available-tags-pool">
                {filteredModelsPool.length === 0 ? (
                  <p className="empty-state">
                    {models.filter(m => !m.active).length === 0 ? "All models selected" : "No models match your search"}
                  </p>
                ) : (
                  filteredModelsPool.map(m => (
                      <div key={m.name} className="tag-pill" title={m.name} onClick={() => {
                        toggleModel(m.name);
                        setSearchModel('');
                      }}>
                        <span className="color-indicator" style={{ backgroundColor: m.color }}></span>
                        <span className="tag-text">{m.name}</span>
                      </div>
                  ))
                )}
                </div>
            </div>
        )}
      </div>

      {/* SECTION TOPICS */}
      <div className="filter-group">
        <h3>Select Topic</h3>
        
        <div className="select-box" onClick={() => !isOpenTopics && setOpenTopics(true)}>
          <div className="selected-tags">
            
            {topics.filter(t => t.active).map(t => (
              <div key={t.name} className="tag" title={t.name} style={{ '--tag-color': t.color } as React.CSSProperties}>
                <span className="color-indicator" style={{ backgroundColor: t.color }}></span>
                <span className="tag-text" onClick={(e) => { e.stopPropagation(); toggleTopic(t.name); }}>
                  {t.name}
                </span>
                <span className="close-tag material-symbols-outlined" onClick={(e) => { e.stopPropagation(); toggleTopic(t.name); }}>
                  close_small
                </span>
              </div>
            ))}
              <input 
                type="text"
                className="search-input"
                placeholder={topics.filter(t => t.active).length > 0 ? "" : "Bob Dylan, Brazilian..."}
                value={searchTopic}
                autoFocus
                onChange={(e) => setSearchTopic(e.target.value)}
              />
          </div>
            
          <div className='filter-buttons'>
            <span 
              className="material-symbols-outlined close-research"
              onClick={(e) => {
                e.stopPropagation();
                if (isOpenTopics) {
                  setOpenTopics(false);
                  setSearchTopic('');
                } else if (topics.some(t => t.active)) {
                  setTopics(prev => prev.map(t => ({...t, active: false})));
                } else {
                  setOpenTopics(true);
                }
              }}
            >
              {isOpenTopics ? 'close' : topics.some(t => t.active) ? 'cancel' : 'search'}
            </span>
          </div>
        </div>

        {isOpenTopics && (
        <div className="dropdown-content">
            <button className="btn-select-all" onClick={() => setTopics(prev => prev.map(t => ({...t, active: true})))}>
              Select All
            </button>
            <div className="available-tags-pool">
                {filteredTopicsPool.length === 0 ? (
                  <p className="empty-state">
                    {topics.filter(t => !t.active).length === 0 ? "All topics selected." : "No topics match your search."}
                  </p>
                ) : (
                  filteredTopicsPool.map(t => (
                    <div key={t.name} className="tag-pill" title={t.name} onClick={() => {
                      toggleTopic(t.name);
                      setSearchTopic('');
                    }}>
                      <span className="color-indicator" style={{ backgroundColor: t.color }}></span>
                      <span className="tag-text">{t.name}</span>
                    </div>
                  ))
                )}
            </div>
        </div>
        )}
      </div>
    </aside>
  )
}