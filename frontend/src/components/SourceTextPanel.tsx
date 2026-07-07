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
                <span>Original Context</span>
                <span onClick={onClose} className="panel-close-btn material-symbols-outlined">close_small</span>
            </div>
                
                {/*Badges*/}
                <div className="original-badge-container">
                    <div className="original-info-tag">
                        <span className="material-symbols-outlined">network_intelligence</span>
                        <span className="tag-text" title={model}>
                            {model}
                        </span>
                    </div>

                    <div className="original-info-tag">
                        <span className="material-symbols-outlined">subject</span>
                        <span className="tag-text" title={topic}>
                            {topic}
                        </span>
                    </div>
                </div>

                <div className="original-text-section">
                    <div className="original-section-title">Original Prompt</div>
                    <blockquote className="original-prompt-box">
                        "{original_prompt || "No prompt available"}"
                    </blockquote>
                </div>
                
                <div className="original-text-section">
                    <div className="original-section-title">Full Response</div>
                    <div className="original-response-box">
                        {full_response || "No response available"}
                    </div>
                </div>

            </div>
    );
}