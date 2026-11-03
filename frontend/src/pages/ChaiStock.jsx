// Chai shop "Menu & Stock": raw material (milk, sugar, tea powder, cups…) with quick
// "add delivery", and the menu with prices and what each cup uses.
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChaiMenu, ChaiMaterials, CATEGORIES } from "../sync/chaiDb.js"
import { backdrop, pop } from "../components/popupMotion.js"
import { SkeletonRows } from "../components/Skeleton.jsx"
import { BillIcon } from "../components/billing/billMotion.jsx"
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())
const INR = n => "₹" + (Math.round((+n || 0) * 100) / 100).toLocaleString("en-IN")
const fmt = n => String(Math.round((+n || 0) * 1000) / 1000)
const UNITS = ["L", "kg", "g", "pc", "packet"]
const EMOJIS = ["☕", "🍵", "🫖", "🫚", "🍋", "🥛", "🍪", "🥟", "🍞", "🥐", "🌶️", "🍩", "🥪", "🍌", "💧", "🚬", "🍬", "🥤"]

const card  = { background:"var(--bg1)", border:"1px solid var(--rule)", borderRadius:16, padding:"12px 14px" }
const input = { minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", padding:"0 12px", fontSize:15,
  background:"var(--bg1)", color:"var(--ink)", width:"100%", minWidth:0, boxSizing:"border-box" }

export default function ChaiStock() {
  const [tab, setTab]     = useState("stock")
  const [mats, setMats]   = useState(null)
  const [menu, setMenu]   = useState(null)
  const [edit, setEdit]   = useState(null)   // { kind:"mat"|"item"|"delivery", value }

  const load = () => Promise.all([ChaiMaterials.list(), ChaiMenu.list()])
    .then(([m, i]) => { setMats(m); setMenu(i) })
    .catch(e => alert(e.message))
  useEffect(() => { load() }, [])

  async function run(fn) {
    try { await fn(); setEdit(null); await load() } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12, maxWidth:900, width:"100%", margin:"0 auto" }}>
      <div style={{ fontSize:22, fontWeight:900 }}>{L("Menu & Stock")}</div>

      <div style={{ display:"flex", gap:6, padding:4, borderRadius:14, background:"var(--bg2)" }}>
        {[["stock", "package", L("Raw material")], ["menu", "coffee", L("Menu")]].map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ position:"relative", flex:1, minHeight:44, border:"none", borderRadius:11, background:"transparent",
              fontWeight:800, fontSize:14, cursor:"pointer", color: tab === id ? "#fff" : "var(--ink-dim)" }}>
            {tab === id && <motion.span layoutId="chai-stock-tab" style={{ position:"absolute", inset:0, borderRadius:11, background:"var(--saffron)" }} />}
            <span style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:8 }}><BillIcon name={icon} size={18} />{label}</span>
          </button>
        ))}
      </div>

      {tab === "stock" ? (
        <>
          <div style={{ fontSize:13, color:"var(--ink-dim)" }}>
            {L("Each sale uses raw material automatically. Tap “+ Delivery” when stock comes in.")}
          </div>
          {!mats ? <SkeletonRows rows={6} /> : mats.map(m => {
            const low = +m.min_stock > 0 && +m.stock <= +m.min_stock
            return (
              <div key={m.id} style={{ ...card, display:"flex", alignItems:"center", gap:10, borderColor: low ? "#e67e22" : "var(--rule)" }}>
                <button onClick={() => setEdit({ kind:"mat", value:m })} style={{ flex:1, minWidth:0, textAlign:"left", background:"none", border:"none", cursor:"pointer", color:"var(--ink)", padding:0 }}>
                  <div style={{ fontWeight:800, fontSize:15, display:"flex", alignItems:"center", gap:6 }}>
                    {m.name}
                    {low && <span style={{ color:"#b35c00", fontSize:12, display:"inline-flex", alignItems:"center", gap:3 }}><BillIcon name="alert" size={13} />{L("low")}</span>}
                  </div>
                  <div style={{ fontSize:12, color:"var(--ink-dim)" }}>{L("Alert below")} {fmt(m.min_stock)} {m.unit}{+m.cost_per_unit ? ` · ${INR(m.cost_per_unit)}/${m.unit}` : ""}</div>
                  <div style={{ height:6, borderRadius:3, background:"var(--bg2)", marginTop:6, overflow:"hidden", maxWidth:220 }}>
                    <motion.div initial={false} animate={{ scaleX: Math.min(1, (+m.stock || 0) / Math.max(+m.min_stock * 3, 0.0001)) }}
                      transition={{ type:"spring", bounce:0, visualDuration:0.5 }}
                      style={{ height:"100%", transformOrigin:"left", borderRadius:3, background: low ? "#e67e22" : "var(--jade)" }} />
                  </div>
                </button>
                <motion.div key={m.stock} initial={{ scale:1.25, color:"var(--jade)" }} animate={{ scale:1, color: low ? "#b35c00" : "var(--ink)" }}
                  style={{ fontWeight:900, fontSize:18, whiteSpace:"nowrap" }}>{fmt(m.stock)} {m.unit}</motion.div>
                <motion.button whileTap={{ scale:0.95 }} onClick={() => setEdit({ kind:"delivery", value:m })}
                  style={{ minHeight:44, padding:"0 14px", borderRadius:12, border:"none", background:"var(--jade)", color:"#fff", fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><BillIcon name="truck" size={18} />{L("Delivery")}</span>
                </motion.button>
              </div>
            )
          })}
          <button onClick={() => setEdit({ kind:"mat", value:{ name:"", unit:"kg", stock:0, min_stock:0, cost_per_unit:0 } })}
            style={{ minHeight:48, borderRadius:14, border:"1.5px dashed var(--saffron)", background:"transparent", color:"var(--saffron)", fontWeight:800, cursor:"pointer" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><BillIcon name="plus" size={18} />{L("Add raw material")}</span>
          </button>
        </>
      ) : (
        <>
          {!menu ? <SkeletonRows rows={6} /> : CATEGORIES.map(c => {
            const items = menu.filter(m => m.category === c)
            if (!items.length) return null
            return (
              <div key={c} style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ fontSize:13, fontWeight:800, color:"var(--ink-faint)", textTransform:"uppercase", letterSpacing:1 }}>{L(c)}</div>
                {items.map(m => (
                  <button key={m.id} onClick={() => setEdit({ kind:"item", value:m })}
                    style={{ ...card, display:"flex", alignItems:"center", gap:12, cursor:"pointer", textAlign:"left", color:"var(--ink)" }}>
                    <span style={{ fontSize:28 }}>{m.emoji || "☕"}</span>
                    <span style={{ flex:1, minWidth:0 }}>
                      <span style={{ display:"block", fontWeight:800, fontSize:15 }}>{m.name}</span>
                      <span style={{ display:"block", fontSize:12, color:"var(--ink-faint)" }}>
                        {(m.recipe || []).length ? (m.recipe || []).map(([id, q]) => {
                          const mat = (mats || []).find(x => x.id === id)
                          return mat ? `${mat.name} ${fmt(q)} ${mat.unit}` : null
                        }).filter(Boolean).join(" · ") : L("No raw material linked")}
                      </span>
                    </span>
                    <span style={{ fontWeight:900, fontSize:17, color:"var(--jade)" }}>{INR(m.price)}</span>
                  </button>
                ))}
              </div>
            )
          })}
          <button onClick={() => setEdit({ kind:"item", value:{ name:"", category:"Tea", price:"", emoji:"☕", recipe:[] } })}
            style={{ minHeight:48, borderRadius:14, border:"1.5px dashed var(--saffron)", background:"transparent", color:"var(--saffron)", fontWeight:800, cursor:"pointer" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><BillIcon name="plus" size={18} />{L("Add menu item")}</span>
          </button>
        </>
      )}

      <AnimatePresence>
        {edit && (
          <motion.div {...backdrop} onClick={() => setEdit(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:70, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <motion.div {...pop} onClick={e => e.stopPropagation()}
              style={{ width:"100%", maxWidth:440, maxHeight:"88vh", overflowY:"auto", background:"var(--bg1)", borderRadius:20, padding:18, display:"flex", flexDirection:"column", gap:12 }}>
              {edit.kind === "delivery" && <DeliveryForm mat={edit.value} onSave={q => run(() => ChaiMaterials.addStock(edit.value.id, q))} onClose={() => setEdit(null)} />}
              {edit.kind === "mat" && <MaterialForm mat={edit.value}
                onSave={v => run(() => ChaiMaterials.save(v))}
                onDelete={edit.value.id ? () => confirm(L("Remove this raw material?")) && run(() => ChaiMaterials.remove(edit.value.id)) : null}
                onClose={() => setEdit(null)} />}
              {edit.kind === "item" && <ItemForm item={edit.value} mats={mats || []}
                onSave={v => run(() => ChaiMenu.save(v))}
                onDelete={edit.value.id ? () => confirm(L("Remove this item from the menu?")) && run(() => ChaiMenu.remove(edit.value.id)) : null}
                onClose={() => setEdit(null)} />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:13, fontWeight:700, color:"var(--ink-dim)", minWidth:0 }}>
      {label}{children}
    </label>
  )
}

function Buttons({ onClose, onDelete, saveLabel, disabled, onSave }) {
  return (
    <div style={{ display:"flex", gap:8, marginTop:4 }}>
      {onDelete && <button onClick={onDelete} style={{ minHeight:48, padding:"0 14px", borderRadius:12, border:"1.5px solid #c0392b", background:"transparent", color:"#c0392b", fontWeight:800, cursor:"pointer" }}>{L("Remove")}</button>}
      <button onClick={onClose} style={{ flex:1, minHeight:48, borderRadius:12, border:"1.5px solid var(--rule)", background:"var(--bg1)", color:"var(--ink)", fontWeight:800, cursor:"pointer" }}>{L("Cancel")}</button>
      <button className="btn btn-primary" disabled={disabled} onClick={onSave} style={{ flex:1, minHeight:48, borderRadius:12, fontWeight:800 }}>{saveLabel || L("Save")}</button>
    </div>
  )
}

function DeliveryForm({ mat, onSave, onClose }) {
  const [qty, setQty] = useState("")
  const quick = mat.unit === "pc" ? [50, 100, 500] : mat.unit === "L" ? [5, 10, 20] : [0.5, 1, 5]
  return (
    <>
      <div style={{ fontSize:17, fontWeight:800, display:"flex", alignItems:"center", gap:8 }}><BillIcon name="truck" size={20} />{mat.name} {L("delivery")}</div>
      <div style={{ fontSize:13, color:"var(--ink-faint)" }}>{L("Now in stock")}: {fmt(mat.stock)} {mat.unit}</div>
      <div style={{ display:"flex", gap:8 }}>
        {quick.map(q => (
          <button key={q} onClick={() => setQty(String((+qty || 0) + q))}
            style={{ flex:1, minHeight:46, borderRadius:12, border:"1.5px solid var(--rule)", background:"var(--bg2)", fontWeight:800, cursor:"pointer", color:"var(--ink)" }}>+{q} {mat.unit}</button>
        ))}
      </div>
      <Field label={`${L("Quantity received")} (${mat.unit})`}>
        <input autoFocus type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} style={input} />
      </Field>
      <Buttons onClose={onClose} disabled={!(+qty > 0)} onSave={() => onSave(+qty)} saveLabel={L("Add to stock")} />
    </>
  )
}

function MaterialForm({ mat, onSave, onDelete, onClose }) {
  const [v, setV] = useState(mat)
  const set = (k, x) => setV(s => ({ ...s, [k]: x }))
  return (
    <>
      <div style={{ fontSize:17, fontWeight:800 }}>{mat.id ? L("Edit raw material") : L("Add raw material")}</div>
      <Field label={L("Name")}><input value={v.name} onChange={e => set("name", e.target.value)} placeholder="Milk" style={input} /></Field>
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:10 }}>
        <Field label={L("Unit")}>
          <select value={v.unit} onChange={e => set("unit", e.target.value)} style={input}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field label={`${L("In stock")} (${v.unit})`}><input type="number" inputMode="decimal" value={v.stock} onChange={e => set("stock", e.target.value)} style={input} /></Field>
        <Field label={`${L("Alert below")} (${v.unit})`}><input type="number" inputMode="decimal" value={v.min_stock} onChange={e => set("min_stock", e.target.value)} style={input} /></Field>
        <Field label={`${L("Cost per")} ${v.unit} (₹)`}><input type="number" inputMode="decimal" value={v.cost_per_unit} onChange={e => set("cost_per_unit", e.target.value)} style={input} /></Field>
      </div>
      <Buttons onClose={onClose} onDelete={onDelete} disabled={!v.name.trim()}
        onSave={() => onSave({ ...v, name: v.name.trim(), stock: +v.stock || 0, min_stock: +v.min_stock || 0, cost_per_unit: +v.cost_per_unit || 0 })} />
    </>
  )
}

function ItemForm({ item, mats, onSave, onDelete, onClose }) {
  const [v, setV] = useState({ ...item, recipe: (item.recipe || []).map(([id, q]) => [id, String(q)]) })
  const set = (k, x) => setV(s => ({ ...s, [k]: x }))
  const setRecipe = (i, j, x) => set("recipe", v.recipe.map((r, k) => k === i ? (j ? [r[0], x] : [x, r[1]]) : r))
  const unitOf = id => mats.find(m => m.id === id)?.unit || ""
  return (
    <>
      <div style={{ fontSize:17, fontWeight:800 }}>{item.id ? L("Edit menu item") : L("Add menu item")}</div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {EMOJIS.map(e => (
          <button key={e} onClick={() => set("emoji", e)}
            style={{ width:40, height:40, fontSize:22, borderRadius:10, cursor:"pointer", border:"2px solid", borderColor: v.emoji === e ? "var(--saffron)" : "transparent", background:"var(--bg2)" }}>{e}</button>
        ))}
      </div>
      <Field label={L("Name")}><input value={v.name} onChange={e => set("name", e.target.value)} placeholder="Ginger Tea" style={input} /></Field>
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:10 }}>
        <Field label={L("Price (₹)")}><input type="number" inputMode="decimal" value={v.price} onChange={e => set("price", e.target.value)} style={input} /></Field>
        <Field label={L("Category")}>
          <select value={v.category} onChange={e => set("category", e.target.value)} style={input}>
            {CATEGORIES.map(c => <option key={c} value={c}>{L(c)}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ fontSize:13, fontWeight:800, color:"var(--ink-dim)" }}>{L("Raw material per cup / piece")}</div>
      {v.recipe.map(([id, q], i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:"minmax(0,1.4fr) minmax(0,1fr) 44px", gap:8, alignItems:"center" }}>
          <select value={id} onChange={e => setRecipe(i, 0, e.target.value)} style={input}>
            {mats.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div style={{ position:"relative" }}>
            <input type="number" inputMode="decimal" value={q} onChange={e => setRecipe(i, 1, e.target.value)} style={{ ...input, paddingRight:34 }} />
            <span style={{ position:"absolute", right:10, top:14, fontSize:12, color:"var(--ink-faint)" }}>{unitOf(id)}</span>
          </div>
          <button aria-label="Remove" onClick={() => set("recipe", v.recipe.filter((_, k) => k !== i))}
            style={{ width:44, height:44, borderRadius:10, border:"1px solid var(--rule)", background:"var(--bg1)", cursor:"pointer", color:"var(--ink-dim)",
              display:"flex", alignItems:"center", justifyContent:"center" }}><BillIcon name="x" size={16} /></button>
        </div>
      ))}
      {mats.length > 0 && (
        <button onClick={() => set("recipe", [...v.recipe, [mats[0].id, ""]])}
          style={{ minHeight:42, borderRadius:12, border:"1.5px dashed var(--rule)", background:"transparent", color:"var(--ink-dim)", fontWeight:700, cursor:"pointer" }}>
          + {L("Link raw material")}
        </button>
      )}
      <Buttons onClose={onClose} onDelete={onDelete} disabled={!v.name.trim() || !(+v.price > 0)}
        onSave={() => onSave({ ...v, name: v.name.trim(), price: +v.price,
          recipe: v.recipe.filter(([id, q]) => id && +q > 0).map(([id, q]) => [id, +q]) })} />
    </>
  )
}
