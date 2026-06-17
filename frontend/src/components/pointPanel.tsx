
interface ModelBar {
    name: string,
    percentage: number;
}

interface ClusterBar {
    name: string;
    percentage: number;
}

interface PhraseItem {
    phrase: string;
    score: number;
}

interface PointDetailsPanelProps {
    onClose: () => void;
    activeColor: string;
    phrases: PhraseItem[];
    models: ModelBar[];
    neighbors: ClusterBar[];
}

export default function PointDetailsPanel ({
    onClose,
    activeColor,
    phrases = [],
    models = [],
    neighbors = []
}: PointDetailsPanelProps) {
    return (
        <div className="Points-panel">

            {/* Partie du tableau dans le container*/}
            <div className="panel-title">
                <span>Top reletated Phrases</span>
                <span onClick={onClose} className="panel-close-btn material-symbols-outlined">close_small</span>
            </div>
            <table className="panel-table">
                <thead>
                    <tr className="table-titles">
                        <th className="phrases-title">Phrases</th>
                        <th className="score-title">Score</th>
                    </tr>
                </thead>
                <tbody>
                    {phrases.map((item, index) => (
                        <tr key={index} className="table-titles">
                            <td className="text">{item.phrase}</td>
                            <td className="score">{item.score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/*Partie Attribution */}

            <div className="attribution-section">
                <div className="attribution-title">Attribution</div>
                <div className="panel-bars-list">
                    {models.map((model, index) => (
                        <div key={index} className="bar-row">
                            <div className="bar-label-line">
                                <strong className="panel-model-name">{model.name}</strong>
                                <span className="panel-model-percentage">{model.percentage}%</span>
                            </div>
                            <div className="bar-track">
                                <div 
                                    className="bar-fill"
                                    style={{
                                        width: `${model.percentage}%`,
                                        backgroundColor: activeColor,
                                        height: '100%',
                                        transition: 'width 0.3s ease' 
                                    }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/*Section Neighboor */}
        <div className="neighbor-section">
            <div className="neighbor-section-title">Nearest neighbors</div>
                <div className="panel-bar-list">
                    {neighbors.map((cluster, index) => (
                        <div key={index} className="bar-row">
                            <div className="bar-lable-line">
                                <strong>{cluster.name}</strong>
                                <span>{cluster.percentage}%</span>
                            </div>
                        </div>
                    ))}
                </div>
        </div>
    </div>
    );
}
