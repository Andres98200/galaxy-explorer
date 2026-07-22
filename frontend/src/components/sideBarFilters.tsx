import { useState } from 'react'
import { type FilterItem } from '../services/api'
import logo from '../assets/LOGO.png'

interface SideBarFiltersProps {
  models: FilterItem[];
  setModels: React.Dispatch<React.SetStateAction<FilterItem[]>>;
  topics: FilterItem[];
  setTopics: React.Dispatch<React.SetStateAction<FilterItem[]>>;
  // 🆕 Ajout des props pour les settings
  settings: FilterItem[];
  setSettings: React.Dispatch<React.SetStateAction<FilterItem[]>>;
}

export default function SidebarFilters({
  models, 
  setModels, 
  topics, 
  setTopics,
  settings,       
  setSettings     
}: SideBarFiltersProps) {
  const [isOpenModels, setOpenModels] = useState(false);
  const [isOpenTopics, setOpenTopics] = useState(false);
  const [isOpenSettings, setOpenSettings] = useState(false); // 🆕

  const [searchModel, setSearchModel] = useState('');
  const [searchTopic, setSearchTopic] = useState('');
  const [searchSetting, setSearchSetting] = useState(''); // 🆕

  const toggleModel = (name: string) => {
    setModels(prev => prev.map(m => m.name === name ? {...m, active: !m.active } : m ));
  };

  const toggleTopic = (name: string) => {
    setTopics(prev => prev.map(t => t.name === name ? {...t, active: !t.active } : t ));
  };

  // 🆕 Toggle pour les settings
  const toggleSetting = (name: string) => {
    setSettings(prev => prev.map(s => s.name === name ? {...s, active: !s.active } : s ));
  };

  const filteredModelsPool = models
    .filter(m => !m.active)
    .filter(m => m.name.toLowerCase().includes(searchModel.toLowerCase()));

  const filteredTopicsPool = topics
    .filter(t => !t.active)
    .filter(t => t.name.toLowerCase().includes(searchTopic.toLowerCase()));

  // 🆕 Filtrage de la liste de recherche pour les settings
  const filteredSettingsPool = settings
    .filter(s => !s.active)
    .filter(s => s.name.toLowerCase().includes(searchSetting.toLowerCase()));

  return (
    <aside className="sidebar" onClick={(e) => e.stopPropagation()}>
      <div className="logo-container">
        <img src={logo} alt='AXECOM IA logo' className='logo-img' title='AXECOM AI'></img>
        <p className='logo-text'>AXECOM AI</p>
      </div>
        
      {/* SECTION MODÈLES */}
      <div className="filter-group">
        <h3>LLM model</h3>
        
        <div className="select-box" onClick={() => !isOpenModels && setOpenModels(true)}>
          <div className="selected-tags">
            
            {models.filter(m => m.active).map(m => (
              <div key={m.name} className="tag" title={m.name}>
                <span className="color-indicator"></span>
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
                placeholder={models.filter(m => m.active).length > 0 ? "" : "GPT, GEMMA, QWEN..."}
                value={searchModel}
                autoFocus={isOpenModels}
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
                <button
                  disabled={models.every(m => m.active)}
                  className="btn-select-all" 
                  onClick={() => setModels(prev => prev.map(m => ({...m, active: true})))}>
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
    <div className='topic-header'>
        <h3>Topics</h3>
      <div className="action-buttons">
        <button 
          title={'Select all'}
          className="btn-select-all-topic"
          disabled={topics.every(t => t.active)}
          onClick={() => setTopics(prev => prev.map(t => ({ ...t, active: true })))}
        >
          <span className='material-symbols-outlined select-all-topic'>
            done_all
          </span>
        </button>

        <button 
          title={'Deselect all'}
          className="btn-deselect-all-topic"
          disabled={topics.every(t => !t.active)}
          onClick={() => setTopics(prev => prev.map(t => ({ ...t, active: false })))}
        >
          <span className='material-symbols-outlined deselect-all-topic'>
            remove_selection
          </span>
        </button>
      </div>
    </div>

    <div className="">
      {searchTopic && (
        <div className="filter-buttons">
          <span 
            className="material-symbols-outlined close-research"
            onClick={() => setSearchTopic('')}
          >
            cancel
          </span>
        </div>
      )}
    </div>

    {/* Liste de Checkboxes */}
    <div className="checkbox-list">
      {topics
        .filter(t => t.name.toLowerCase().includes(searchTopic.toLowerCase()))
        .map(t => (
          <label key={t.name} className="checkbox-item" title={t.name}>
            <input
              type="checkbox"
              checked={t.active}
              onChange={() => toggleTopic(t.name)}
            />
            <span className="color-indicator"></span>
            <span className="checkbox-label">{t.name}</span>
          </label>
        ))}

      {topics.filter(t => t.name.toLowerCase().includes(searchTopic.toLowerCase())).length === 0 && (
        <p className="empty-state">No topics found</p>
      )}
    </div>
  </div>

        {/* 🆕 SECTION SETTINGS */}
    <div className="filter-group">
        <div className="topic-header">
          <h3>Settings</h3>
          <div className="action-buttons">
            <button 
              title="Select all"
              className="btn-select-all-topic"
              disabled={settings.every(s => s.active)}
              onClick={() => setSettings(prev => prev.map(s => ({ ...s, active: true })))}
            >
              <span className="material-symbols-outlined select-all-topic">
                done_all
              </span>
            </button>

            <button 
              title="Deselect all"
              className="btn-deselect-all-topic"
              disabled={settings.every(s => !s.active)}
              onClick={() => setSettings(prev => prev.map(s => ({ ...s, active: false })))}
            >
              <span className="material-symbols-outlined deselect-all-topic">
                remove_selection
              </span>
            </button>
          </div>
        </div>

        {/* Bouton pour effacer la recherche si du texte est saisi */}
        <div>
          {searchSetting && (
            <div className="filter-buttons">
              <span 
                className="material-symbols-outlined close-research"
                onClick={() => setSearchSetting('')}
              >
                cancel
              </span>
            </div>
          )}
        </div>

        {/* Liste de Checkboxes */}
        <div className="checkbox-list">
          {settings
            .filter(s => s.name.toLowerCase().includes(searchSetting.toLowerCase()))
            .map(s => (
              <label key={s.name} className="checkbox-item" title={s.name}>
                <input
                  type="checkbox"
                  checked={s.active}
                  onChange={() => toggleSetting(s.name)}
                />
                <span className="color-indicator" style={{ backgroundColor: s.color }}></span>
                <span className="checkbox-label">{s.name}</span>
              </label>
            ))}

          {settings.filter(s => s.name.toLowerCase().includes(searchSetting.toLowerCase())).length === 0 && (
            <p className="empty-state">No settings found</p>
          )}
        </div>
    </div>
</aside>
  )
}