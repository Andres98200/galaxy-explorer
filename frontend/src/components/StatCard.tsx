interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    iconColor: string;
}

export default function StatCard({ title, value, icon, iconColor }: StatCardProps) {
    return (
        <div className="stat-card">
                <span 
                className="material-symbols-outlined stat-card-icon"
                style={{ backgroundColor: `${iconColor}15`, color: iconColor}}
                >
                    {icon}
                </span>
                <div className="stat-card-content">
                    <span className="stat-card-title">{title}</span>
                    <div className="stat-card-value">{value}</div>
            </div>
                
        </div>
    )
}
