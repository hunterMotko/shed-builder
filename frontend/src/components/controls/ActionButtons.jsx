export const ActionButtons = ({ onSave, onLoad, onReset, isLoading = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <button
      onClick={onSave}
      disabled={isLoading}
      style={{
        width: '100%',
        padding: '9px 0',
        background: isLoading ? '#15803d' : '#16a34a',
        color: '#fff',
        border: 'none',
        borderRadius: 7,
        fontSize: 13,
        fontWeight: 600,
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.7 : 1,
        transition: 'background 120ms',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
      onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#15803d'; }}
      onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = '#16a34a'; }}
    >
      {isLoading ? (
        <>
          <span style={{
            width: 12, height: 12,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }} />
          Saving…
        </>
      ) : 'Save Design'}
    </button>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <button
        onClick={onLoad}
        disabled={isLoading}
        style={{
          padding: '8px 0',
          background: '#334155',
          color: '#cbd5e1',
          border: 'none',
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 120ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#475569'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#334155'; }}
      >
        Load
      </button>
      <button
        onClick={onReset}
        disabled={isLoading}
        style={{
          padding: '8px 0',
          background: 'transparent',
          color: '#f87171',
          border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 120ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        Reset
      </button>
    </div>
  </div>
);
