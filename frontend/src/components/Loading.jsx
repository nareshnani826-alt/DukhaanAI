// Shared "still loading" indicator: the saffron dots from the app loader plus an optional label
export default function Loading({ label, compact = false }) {
  return (
    <span role="status" style={{ display:"inline-flex", flexDirection: compact ? "row" : "column", alignItems:"center",
      gap: compact ? 10 : 12, color:"var(--ink-faint)", fontSize:13, fontWeight:600 }}>
      <span className="dk-loader" aria-hidden="true"><span/><span/><span/></span>
      {label && <span>{label}</span>}
    </span>
  )
}
