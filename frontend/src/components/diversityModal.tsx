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
  const [showTopicColumn, setShowTopicColumn] = useState<boolean>(false);

  const [selectedModels, setSelectedModels] = useState<string[]>(availableModels);
  const [selectedSettings, setSelectedSettings] = useState<string[]>(availableSettings);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(availableTopics);

  const [sortField, setSortField] = useState<SortField>('hsd');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Synchronise les filtres internes quand les props disponibles ou isOpen changent
  useEffect(() => {
    if (isOpen) {
      setSelectedModels(availableModels);
      setSelectedSettings(availableSettings);
      setSelectedTopics(availableTopics);
    }
  }, [isOpen, availableModels, availableSettings, availableTopics]);

  if (!isOpen) return null;

  const filteredData = useMemo(() => {
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
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>📊 Diversity Matrix Overview</h2>
          <button className="modal-close-icon" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-filters-bar">
          <label className="topic-toggle-label">
            <input
              type="checkbox"
              checked={showTopicColumn}
              onChange={e => setShowTopicColumn(e.target.checked)}
            />
            <span>Show Topic Column (Detailed View)</span>
          </label>

          <div className="filter-group">
            <strong>Models:</strong>
            <div className="filter-chips">
              {availableModels.map(m => (
                <button
                  key={m}
                  className={`chip ${selectedModels.includes(m) ? 'active' : ''}`}
                  onClick={() => toggleSelection(m, selectedModels, setSelectedModels)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <strong>Settings:</strong>
            <div className="filter-chips">
              {availableSettings.map(s => (
                <button
                  key={s}
                  className={`chip ${selectedSettings.includes(s) ? 'active' : ''}`}
                  onClick={() => toggleSelection(s, selectedSettings, setSelectedSettings)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-table-container">
          <table className="diversity-matrix-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('model')}>
                  Model {sortField === 'model' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('setting')}>
                  Setting {sortField === 'setting' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                {showTopicColumn && (
                  <th onClick={() => handleSort('topic')}>
                    Topic {sortField === 'topic' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                )}
                <th onClick={() => handleSort('hsd')}>
                  Avg HSD {sortField === 'hsd' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('vs')}>
                  Avg VS {sortField === 'vs' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('cd')}>
                  Avg CD {sortField === 'cd' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? (
                sortedData.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <strong>{row.model}</strong>
                    </td>
                    <td>
                      <span className="badge-setting">{row.setting}</span>
                    </td>
                    {showTopicColumn && <td>{row.topic}</td>}
                    <td>{row.hsd.toFixed(3)}</td>
                    <td>{row.vs.toFixed(3)}</td>
                    <td>{row.cd.toFixed(3)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={showTopicColumn ? 6 : 5} className="no-data">
                    No data matching selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-apply" onClick={handleSaveAndApply}>
            Save Filters & Apply to Galaxy
          </button>
        </div>
      </div>
    </div>
  );
}