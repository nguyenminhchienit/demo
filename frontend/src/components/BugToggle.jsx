export default function BugToggle({ checked, onChange }) {
  return (
    <div className="bug-toggle" aria-label="Simulate bug">
      <span className="toggle-title">Simulate bug</span>
      <span className={!checked ? "mode-label active" : "mode-label"}>After (Fixed)</span>
      <button
        type="button"
        className={checked ? "switch is-on" : "switch"}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-thumb" />
      </button>
      <span className={checked ? "mode-label active bug" : "mode-label"}>Before (Bug)</span>
    </div>
  );
}
