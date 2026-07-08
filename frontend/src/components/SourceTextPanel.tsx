import { useState } from "react";

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

    // Notre interrupteur magique
    const [showFullPrompt, setShowFullPrompt] = useState(false);

    const shortPrompt = original_prompt ? original_prompt.trim().split('\n')[0] : "";

    return (
        <div className="Points-panel">
            {/* 1. Titre et bouton de fermeture globale */}
            <div className="panel-title">
                <span>Original Context</span>
                <span onClick={onClose} className="panel-close-btn material-symbols-outlined">close_small</span>
            </div>
                
            {/* 2. Badges */}
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

            {/* 3. Condition : On affiche le petit bloc du haut UNIQUEMENT si on ne consulte pas le prompt en grand */}
            {!showFullPrompt && (
                <div className="original-text-section">
                    <div className="original-section-title">Original Prompt</div>
                    <blockquote className="original-prompt-box">
                        "{shortPrompt || "No prompt available"}"
                        <button  
                            title="View Full Prompt" 
                            onClick={() => setShowFullPrompt(true)} 
                            className="full-prompt-btn material-symbols-outlined"
                        >
                            pageview
                        </button>
                    </blockquote>
                </div>
            )}
            
            {/* 4. La grande boîte du bas (Elle change de contenu et de titre dynamiquement) */}
            <div className="original-text-section">
                <div className="original-prompt-title">
                    <span>{showFullPrompt ? "Full Original Prompt" : "Full Response"}</span>
                                        {showFullPrompt && (
                        <button  
                            title="View the full response" 
                            onClick={() => setShowFullPrompt(false)} 
                            className="full-prompt-btn material-symbols-outlined" 
                        >
                            wrap_text
                        </button>
                    )}
                </div>

                {/* Ta boîte de style existante reste inchangée, elle change juste son texte */}
                <div className="original-response-box fade-in-animation"
                     key={showFullPrompt ? "prompt" : "response"}>
                    {showFullPrompt 
                        ? (original_prompt || "No prompt available")
                        : (full_response || "No response available")
                    }
                </div>
            </div>
        </div>
    );
}