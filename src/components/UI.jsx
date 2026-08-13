import { X, Search } from 'lucide-react';
export const Button = ({ children, variant = '', ...p }) => (
  <button className={`btn ${variant}`} {...p}>
    {children}
  </button>
);
export const Badge = ({ children }) => (
  <span className={`badge ${String(children).toLowerCase().replace(' ', '-')}`}>{children}</span>
);
export const Empty = ({ text = 'No records found' }) => <div className="empty">{text}</div>;
export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);
export function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search">
      <Search size={18} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
