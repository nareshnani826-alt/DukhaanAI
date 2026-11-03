// Skeleton placeholders: grey shapes of the content that's on its way, with a soft shimmer
// (.sk in index.css). Shown instead of "Loading…" so screens feel instant and don't jump.

export function SkeletonBar({ w = "60%", h = 12, r = 6, style }) {
  return <span className="sk" aria-hidden="true" style={{ display:"block", width:w, height:h, borderRadius:r, ...style }} />
}

// List rows: icon, two lines of text and an amount — bills, customers, stock items
export function SkeletonRows({ rows = 5 }) {
  return (
    <div role="status" aria-label="Loading" style={{ display:"flex", flexDirection:"column", gap:8, padding:"4px 0" }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:14,
          background:"var(--bg2)", border:"1px solid var(--rule)", opacity: 1 - i * 0.12 }}>
          <span className="sk" style={{ width:38, height:38, borderRadius:10, flexShrink:0 }} />
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
            <SkeletonBar w={`${62 - (i % 3) * 9}%`} h={12} />
            <SkeletonBar w="34%" h={10} />
          </div>
          <SkeletonBar w={54} h={14} />
        </div>
      ))}
    </div>
  )
}

// Product tiles for the billing grid
export function SkeletonTiles({ count = 8, min = 150, height = 72 }) {
  return (
    <div role="status" aria-label="Loading"
      style={{ display:"grid", gridTemplateColumns:`repeat(auto-fill,minmax(${min}px,1fr))`, gap:8, paddingTop:4 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ height, borderRadius:12, background:"var(--bg2)", border:"1px solid var(--rule)",
          padding:10, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
          <SkeletonBar w={`${70 - (i % 3) * 12}%`} h={12} />
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <SkeletonBar w={44} h={14} />
            <SkeletonBar w={36} h={10} />
          </div>
        </div>
      ))}
    </div>
  )
}
