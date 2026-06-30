interface SourceTextPanelProps {
    onClose: () => void;
    selectedPointId: number;
    model: string;
    topic: string;
    original_prompt: string;
    full_response: string;
}

export default function SourceTextPanel({
    onClose,
    model, 
    topic,
    original_prompt,
    full_response
}: SourceTextPanelProps) {
    return (
        <div className="Points-panel">
            <div className="panel-title">
                <span>Original Prompt</span>
                <span onClick={onClose} className="panel-close-btn material-symbols-outlined">close_small</span>
            </div>
            <table className="panel-table">
                <thead className="table-titles">
                    <th className="phrases-Title">Model</th>
                </thead>
                <tbody className="text">
                    <td>{model}</td>
                    <td>{topic}</td>
                    <td>{original_prompt}</td>
                </tbody>
                    
                        
                        
                        {full_response}
            </table>
    </div>
    );
}
