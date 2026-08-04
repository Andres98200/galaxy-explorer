import React, { useState, useMemo, useEffect } from 'react';

export interface DiversityMatrixRow {
  model: string;
  setting: string;
  topic: string;
  hsd: number;
  vs: number;
  cd: number;
}

interface DiversityModalProps {
  isOpen: boolean;
  onClose: () => void;
  matrixData: DiversityMatrixRow[];
  availableModels: string[];
  availableSettings: string[];
  availableTopics: string[];
  onSaveFilters: (
    selectedModels: string[],
    selectedSettings: string[],
    selectedTopics: string[]
  ) => void;
}

type SortField = 'model' | 'setting' | 'topic' | 'hsd' | 'vs' | 'cd';
type SortOrder = 'asc' | 'desc';

export default function DiversityModal({
  isOpen,
  onClose,
  matrixData,
  availableModels,
  availableSettings,
  availableTopics,
  onSaveFilters
}: DiversityModalProps) {
  const [showTopicColumn, setShowTopicColumn] = useState<boolean>(true);

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedSettings, setSelectedSettings] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const [sortField, setSortField] = useState<SortField>('hsd');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [settingDropdownOpen, setSettingDropdownOpen] = useState(false);

  // 🛠️ FIX : On synchronise les filtres UNIQUEMENT à l'ouverture de la modal
  useEffect(() => {
    if (isOpen) {
      setSelectedModels(availableModels);
      setSelectedSettings(availableSettings);
      setSelectedTopics(availableTopics);
    }
  }, [isOpen]); 

  if (!isOpen) return null;

  // 🛠️ FIX : Sécurité si matrixData est vide/non chargée
  const filteredData = useMemo(() => {
    if (!matrixData || matrixData.length === 0) return [];
    return matrixData.filter(
      row =>
        selectedModels.includes(row.model) &&
        selectedSettings.includes(row.setting) &&
        selectedTopics.includes(row.topic)
    );
  }, [matrixData, selectedModels, selectedSettings, selectedTopics]);

  const displayData = useMemo(() => {
    if (showTopicColumn) {
      return filteredData;
    }

    const map = new Map<
      string,
      {
        model: string;
        setting: string;
        hsdSum: number;
        vsSum: number;
        cdSum: number;
        count: number;
      }
    >();

    filteredData.forEach(row => {
      const key = `${row.model}___${row.setting}`;
      if (!map.has(key)) {
        map.set(key, {
          model: row.model,
          setting: row.setting,
          hsdSum: 0,
          vsSum: 0,
          cdSum: 0,
          count: 0
        });
      }
      const entry = map.get(key)!;
      entry.hsdSum += row.hsd;
      entry.vsSum += row.vs;
      entry.cdSum += row.cd;
      entry.count += 1;
    });

    return Array.from(map.values()).map(e => ({
      model: e.model,
      setting: e.setting,
      topic: '',
      hsd: e.count > 0 ? e.hsdSum / e.count : 0,
      vs: e.count > 0 ? e.vsSum / e.count : 0,
      cd: e.count > 0 ? e.cdSum / e.count : 0
    }));
  }, [filteredData, showTopicColumn]);

  const sortedData = useMemo(() => {
    return [...displayData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [displayData, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelection = (
    item: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSaveAndApply = () => {
    onSaveFilters(selectedModels, selectedSettings, selectedTopics);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2>Diversity Explorer</h2>
          <button className="modal-close-icon" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Filters Bar */}
        <div className="modal-filters-bar">
          
          {/* Filter Model */}
          <div className="filter-item">
            <span className="filter-label">MODEL</span>
            <div className="custom-select-wrapper">
              <button 
                className="custom-select-btn"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              >
                <span>
                  {selectedModels.length === availableModels.length
                    ? 'All models'
                    : `${selectedModels.length} selected`}
                </span>
                <span className="chevron material-symbols-outlined">keyboard_arrow_down</span>
              </button>

              {modelDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div className="modal-checkbox-list">
                    {availableModels.map(m => (
                      <label key={m} className="modal-checkbox-item" title={m}>
                        <input
                          type="checkbox"
                          checked={selectedModels.includes(m)}
                          onChange={() => toggleSelection(m, selectedModels, setSelectedModels)}
                        />
                        <span className="modal-checkbox-label">{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter Setting */}
          <div className="filter-item">
            <span className="filter-label">SETTING</span>
            <div className="custom-select-wrapper">
              <button 
                className="custom-select-btn"
                onClick={() => setSettingDropdownOpen(!settingDropdownOpen)}
              >
                <span>
                  {selectedSettings.length === availableSettings.length
                    ? 'Default (Base)'
                    : `${selectedSettings.length} selected`}
                </span>
                <span className="chevron material-symbols-outlined">keyboard_arrow_down</span>
              </button>

              {settingDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div className="modal-checkbox-list">
                    {availableSettings.map(s => (
                      <label key={s} className="modal-checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedSettings.includes(s)}
                          onChange={() => toggleSelection(s, selectedSettings, setSelectedSettings)}
                        />
                        <span className="modal-checkbox-label">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="toggle-container">
            <span className="toggle-text">Details by Topic</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={showTopicColumn}
                onChange={e => setShowTopicColumn(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {/* Table Area */}
        <div className="modal-table-container">
          <table className="diversity-matrix-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('model')}>
                  <span className="th-content">
                    MODEL <span className="sort-icon material-symbols-outlined">swap_vert</span>
                  </span>
                </th>
                <th onClick={() => handleSort('setting')}>
                  <span className="th-content">
                    SETTING <span className="sort-icon material-symbols-outlined">swap_vert</span>
                  </span>
                </th>
                {showTopicColumn && (
                  <th onClick={() => handleSort('topic')}>
                    <span className="th-content">
                      TOPIC <span className="sort-icon material-symbols-outlined">swap_vert</span>
                    </span>
                  </th>
                )}
                <th onClick={() => handleSort('hsd')} className="text-right">
                  <span className="th-content">
                    HSD <span className="sort-icon material-symbols-outlined">swap_vert</span>
                  </span>
                </th>
                <th onClick={() => handleSort('vs')} className="text-right">
                  <span className="th-content">
                    VENDI (VS) <span className="sort-icon material-symbols-outlined">swap_vert</span>
                  </span>
                </th>
                <th onClick={() => handleSort('cd')} className="text-right">
                  <span className="th-content">
                    COSINE (CD) <span className="sort-icon material-symbols-outlined">swap_vert</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? (
                sortedData.map((row, i) => (
                  <tr key={i}>
                    <td className="col-model">{row.model}</td>
                    <td className="col-setting">{row.setting}</td>
                    {showTopicColumn && <td className="col-topic">{row.topic}</td>}
                    <td className="col-number text-right">{row.hsd.toFixed(3)}</td>
                    <td className="col-number text-right">{row.vs.toFixed(2)}</td>
                    <td className="col-number text-right">{row.cd.toFixed(3)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={showTopicColumn ? 6 : 5} className="no-data">
                    No data matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-apply" onClick={handleSaveAndApply}>
            Save and update galaxy
          </button>
        </div>

      </div>
    </div>
  );
}