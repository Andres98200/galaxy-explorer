import { useState } from 'react'
import { type FilterItem } from '../services/api'
import logo from '../assets/LOGO.png'

interface SideBarFiltersProps {
  models: FilterItem[];
  setModels: React.Dispatch<React.SetStateAction<FilterItem[]>>;
  topics: FilterItem[];
  setTopics: React.Dispatch<React.SetStateAction<FilterItem[]>>;
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
  const [isOpenSettings, setOpenSettings] = useState(false);

  // Nouvel état pour étendre ou réduire les modèles sélectionnés
  const [showAllModels, setShowAllModels] = useState(false);

  const [searchModel, setSearchModel] = useState('');
  const [searchTopic, setSearchTopic] = useState('');
  const [searchSetting, setSearchSetting] = useState('');

  const toggleModel = (name: string) => {
    setModels(prev => prev.map(m => m.name === name ? {...m, active: !m.active } : m ));
  };

  const toggleTopic = (name: string) => {
    setTopics(prev => prev.map(t => t.name === name ? {...t, active: !t.active } : t ));
  };

  const toggleSetting = (name: string) => {
    setSettings(prev => prev.map(s => s.name === name ? {...s, active: !s.active } : s ));
  };

  const activeModels = models.filter(m => m.active);
  // Si showAllModels est false, on limite l'affichage aux 6 premiers
  const displayedActiveModels = showAllModels ? activeModels : activeModels.slice(0, 6);

  const filteredModelsPool = models
    .filter(m => !m.active)
    .filter(m => m.name.toLowerCase().includes(searchModel.toLowerCase()));

  return (
    <aside className="sidebar" onClick={(e) => e.stopPropagation()}>
      <div className="logo-container">
        <img src={logo} alt='AXECOM IA logo' className='logo-img' title='AXECOM AI' />
        <p className='logo-text'>AXECOM AI</p>
      </div>
        
      {/* SECTION MODÈLES */}
      <div className="filter-group">
        <div className='filters-header'>
          <h3>LLM model</h3>
          <div className='action-buttons'>
            <button 
              title='Search model' 
              className='btn-search-all-topic'
              onClick={()=> {
                setOpenModels(!isOpenModels);
                if (isOpenModels) setSearchModel('');
              }}
            >
              <span className="material-symbols-outlined select-all-topic">
                {isOpenModels ? 'close' : 'search'}
              </span>
            </button>

            <button 
              title='Select all' 
              className='btn-select-all-topic'
              disabled={models.every(m => m.active)}
              onClick={()=> setModels(prev => prev.map(m => ({...m, active: true})))}
            >
              <span className='material-symbols-outlined select-all-topic'>
                dashboard_2_add
              </span>
            </button>

            <button 
              title={'Deselect all'}
              className="btn-deselect-all-topic"
              disabled={models.every(m => !m.active)}
              onClick={() => setModels(prev => prev.map(m => ({ ...m, active: false })))}
            >
              <span className='material-symbols-outlined deselect-all-topic'>
                remove_selection
              </span>
            </button>
          </div>
           </div>

          {isOpenModels && (
            <div className="search-box-container">
              <input 
                type="text"
                className="search-input"
                placeholder="Search Model..."
                value={searchModel}
                autoFocus
                onChange={(e) => setSearchModel(e.target.value)}
              />
            </div>
          )}

        
        <div className="select-box" onClick={() => !isOpenModels && setOpenModels(true)}>
          {/* Classe conditionnelle 'scrollable' appliquée quand étendu */}
          <div className={`selected-tags ${showAllModels ? 'expanded-scroll' : ''}`}>
            {displayedActiveModels.map(m => (
              <div key={m.name} className="tag" title={m.name}>
                <span className="color-indicator" style={{ backgroundColor: m.color }}></span>
                <span className="tag-text" onClick={(e) => { e.stopPropagation(); toggleModel(m.name); }}>
                  {m.name}
                </span>
                <span className="close-tag material-symbols-outlined" onClick={(e) => { e.stopPropagation(); toggleModel(m.name); }}>
                  close_small
                </span>
              </div>
            ))}
          </div>

          {/* Bouton Show More / Show Less (affiché uniquement si > 6 modèles sélectionnés) */}
          {activeModels.length > 6 && (
            <button 
              className="btn-show-more"
              onClick={(e) => {
                e.stopPropagation();
                setShowAllModels(!showAllModels);
              }}
            >
              {showAllModels ? 'Show less' : ` Show more (${activeModels.length - 6})`}
            </button>
          )}
        </div>
        
        {isOpenModels && (
          <div className="dropdown-content">
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
        <div className='filters-header'>
          <h3>Topics</h3>
          <div className="action-buttons">
            <button
              title="Search topic"
              className="btn-search-all-topic"
              onClick={() => {
                setOpenTopics(!isOpenTopics);
                if (isOpenTopics) setSearchTopic('');
              }}
            >
              <span className='material-symbols-outlined select-all-topic'>
                {isOpenTopics ? 'close' : 'search'}
              </span>
            </button>

            <button 
              title={'Select all'}
              className="btn-select-all-topic"
              disabled={topics.every(t => t.active)}
              onClick={() => setTopics(prev => prev.map(t => ({ ...t, active: true })))}
            >
              <span className='material-symbols-outlined select-all-topic'>
                list_alt_check
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

        {isOpenTopics && (
          <div className="search-box-container">
            <input 
              type="text"
              className="search-input"
              placeholder="Search topics..."
              value={searchTopic}
              autoFocus
              onChange={(e) => setSearchTopic(e.target.value)}
            />
          </div>
        )}

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
                <span className="color-indicator" style={{ backgroundColor: t.color }}></span>
                <span className="checkbox-label">{t.name}</span>
              </label>
            ))}

          {topics.filter(t => t.name.toLowerCase().includes(searchTopic.toLowerCase())).length === 0 && (
            <p className="empty-state">No topics found</p>
          )}
        </div>
      </div>

      {/* SECTION SETTINGS */}
      <div className="filter-group">
        <div className="filters-header">
          <h3>Settings</h3>
          <div className="action-buttons">
            <button
              title="Search setting"
              className="btn-select-all-topic"
              onClick={() => {
                setOpenSettings(!isOpenSettings);
                if (isOpenSettings) setSearchSetting('');
              }}
            >
              <span className='material-symbols-outlined select-all-topic'>
                {isOpenSettings ? 'close' : 'search'}
              </span>
            </button>

            <button 
              title="Select all"
              className="btn-select-all-topic"
              disabled={settings.every(s => s.active)}
              onClick={() => setSettings(prev => prev.map(s => ({ ...s, active: true })))}
            >
              <span className="material-symbols-outlined select-all-topic">
                list_alt_check
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

        {isOpenSettings && (
          <div className="search-box-container">
            <input 
              type="text"
              className="search-input"
              placeholder="Search settings..."
              value={searchSetting}
              autoFocus
              onChange={(e) => setSearchSetting(e.target.value)}
            />
          </div>
        )}

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