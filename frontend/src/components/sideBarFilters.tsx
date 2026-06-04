import { useState } from 'react'

export default function SidebarFilters() {


  const [isOpenModels, setOpenModels] = useState(false)
  const [isOpenTopics, setOpenTopics] = useState(false)
    
  const models = [
    { name: 'GPT-4', color: '#4db5fa', active: true },
    { name: 'Qwen', color: '#ff9933', active: true },
    { name: 'Meta-llama', color: '#00ff66', active: false },
    { name: 'Gemma', color: '#ffcc00', active: false },
    { name: 'GPT-5', color: '#ff3399', active: false },
  ]

  const topics = [
    { name: 'Donald', color: '#0099ff', active: true },
    { name: 'Brazil', color: '#ff9933', active: true },
    { name: 'War of China', color: '#00ff66', active: false },
    { name: 'Water', color: '#ffcc00', active: false },
    { name: 'Moon', color: '#ff3399', active: false },
  ]

  return (

    <aside className="sidebar">
        <div className="logo">LOGO INCOMING</div>
      {/* SECTION MODÈLES */}
      <div className="filter-group">
        <h3>Select LLM model</h3>
        <div className="select-box" onClick={()=> setOpenModels(!isOpenModels)}>
          <div className="selected-tags">
            {models.filter(m => m.active).map(m => (
              <span key={m.name} className="tag" style={{ backgroundColor: m.color }}>
                {m.name} <span className="close-tag material-symbols-outlined">close_small</span>
              </span>
            ))}
          </div>
          <span className=" drop-down-arrow material-symbols-outlined">keyboard_arrow_down</span>
        </div>
        
        {isOpenModels && (
            <div className="dropdown-content">
                <button className="btn-select-all">Select All</button>
                <div className="available-tags-pool">
                {models.filter(m => !m.active).map(m => (
                    <span key={m.name} className="tag-pill" style={{ backgroundColor: m.color}}>
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
              <span key={t.name} className="tag" style={{ backgroundColor: t.color }}>
                {t.name} <span className="close-tag material-symbols-outlined">close_small</span>
              </span>
            ))}
          </div>
          <span className="drop-down-arrow material-symbols-outlined">keyboard_arrow_down</span>
        </div>

        {isOpenTopics && (
        <div className="dropdown-content">
            <button className="btn-select-all">Select All</button>
                <div className="available-tags-pool">
                {topics.filter(t => !t.active).map(t => (
                <span key={t.name} className="tag-pill" style={{ backgroundColor: t.color}}>
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