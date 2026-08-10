import Skeleton from "../Skeletons/Skeleton";
import logo from "../../assets/LOGO.png";

export default function SideBarFilterSkeleton() {
  return (
    <div className="sidebar-skeleton-content">
      {/* Header Logo */}
      <div className="logo-container">
        <img src={logo} alt="AXECOM IA logo" className="logo-img" title="AXECOM AI" />
        <p className="logo-text">AXECOM AI</p>
      </div>

      {/* LLM MODEL */}
      <div className="filter-group">
        <div className="filters-header">
            <Skeleton className="filters-header-skeleton"/>
            <div className="action-buttons">
                <Skeleton className="btn-search-all-topic-skeleton" />
                <Skeleton className="btn-search-all-topic-skeleton" />
                <Skeleton className="btn-search-all-topic-skeleton" />
            </div>
        </div>

        <div className="select-box">
            <Skeleton className="select-box-skeleton"/>
            <div className="selected-tags">
                {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="tag-skeleton"/>
          ))}
            </div>

            <div className="btn-show-more">
                <Skeleton className="btn-show-more-skeleton"/>
            </div>
        </div>
      </div>

      {/* TOPICS */}
      <div className="filter-group">
        <div className="filters-header">
          <Skeleton className="filters-header-skeleton" />
          <div className="action-buttons">
            <Skeleton className="btn-search-all-topic-skeleton" />
            <Skeleton className="btn-search-all-topic-skeleton" />
            <Skeleton className="btn-search-all-topic-skeleton" />
          </div>
        </div>
        
        {/* 4-5 items skeleton */}
        <div className="checkbox-list">
            {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="checkbox-list-skeleton" />
            ))}
        </div>
      </div>

      {/* SETTINGS */}
        <div className="filter-group">
        <div className="filters-header">
          <Skeleton className="filters-header-skeleton" />
          <div className="action-buttons">
            <Skeleton className="action-button-skeleton" />
            <Skeleton className="action-button-skeleton" />
            <Skeleton className="action-button-skeleton" />
          </div>
        </div>
        
        <div className="checkbox-list">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="checkbox-list-skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
