import './Button.css';

function Button({ children, onClick, variant = 'primary', fullWidth = false }) {
  return (
    <button
      className={`btn btn-${variant} ${fullWidth ? 'btn-full' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;