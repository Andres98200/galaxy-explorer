import React from "react"

interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    iconColor: string;
}

export default function StatCard({ title, value, icon, iconColor }: StatCardProps) {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <span 
                className="material-symbols-outlined stat-card-icon"
                style={{ backgroundColor: `${iconColor}15`, color: iconColor}}
                >
                    {icon}
                </span>
                <span className="stat-card-title">{title}</span>
            </div>
            <div className="stat-card-value">{value}</div>
        </div>
    )
}
