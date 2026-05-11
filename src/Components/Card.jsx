import './Card.css';

function Card({ children, title, className = '', accent = false, onClick }) {
  return (
    <div
      className={`card ${accent ? 'card-accent' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="card-shimmer" aria-hidden="true" />
      {title && <h3 className="card-title">{title}</h3>}
      {children}
    </div>
  );
}

export default Card;
