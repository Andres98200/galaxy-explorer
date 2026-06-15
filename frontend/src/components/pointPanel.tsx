
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
        <div className="details-panel-container">

            {/* Partie du tableau dans le container*/}
            <div className="pannel-title">
                <span>Top reletated Phrases</span>
            </div>
            <button onClick={onClose} className="panel-close-btn"></button>
            <table className="panel-phrases-table">
                <thead>
                    <tr>
                        <th>Phrase</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    {phrases.map((item, index) => (
                        <tr key={index}>
                            <td className="truncate-text">{item.phrase}</td>
                            <td>{item.score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/*Partie Attribution */}

            <div className="attribution-title">Attribution</div>
            <div className="panel-bars-list">
                {models.map((model, index) => (
                    <div key={index} className="bar-row">
                        <div className="bar-label-line">
                            <strong>{model.name}</strong>
                            <span>{model.percentage}%</span>
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

            {/*Section Neighboor */}

            <div className="neighbor-section-title">Nerest neighbors</div>
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
    );
}
