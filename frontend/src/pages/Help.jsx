import { useState, useRef } from "react"
import { HELP_SECTIONS } from "./helpArticles"
import { tr, uiLang } from "../i18n/kiranaStrings"

// The guide is in helpArticles.js — { en, te, hi } per title and article
const SECTIONS = HELP_SECTIONS
const L = k => tr(k, uiLang())
const pick = v => typeof v === "string" ? v : (v[uiLang().slice(0, 2)] || v.en)

export default function Help() {
  const [activeSection, setActiveSection] = useState("getting-started")
  const [activeArticle, setActiveArticle] = useState(0)
  const [search, setSearch] = useState("")
  const articleRef = useRef(null)
  // On a phone the article sits below the list — bring it into view when one is tapped
  const openArticle = (sectionId, idx) => {
    setActiveSection(sectionId); setActiveArticle(idx)
    if (window.innerWidth < 768) setTimeout(() => articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  const filtered = search
    ? SECTIONS.map(s => ({
        ...s,
        articles: s.articles.filter(a =>
          pick(a.title).toLowerCase().includes(search.toLowerCase()) ||
          pick(a.content).toLowerCase().includes(search.toLowerCase())
        )
      })).filter(s => s.articles.length > 0)
    : SECTIONS

  const currentSection = SECTIONS.find(s => s.id === activeSection)
  const currentArticle = currentSection?.articles[activeArticle]

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold">{L("Help")}</h1>
          <p className="text-[10px] text-gray-400">{L("How to use DukaanAI, step by step")}</p>
        </div>
      </div>

      {/* Search */}
      <input className="input mb-4" placeholder={"🔍 " + L("Search help...")}
        value={search} onChange={e => { setSearch(e.target.value); setActiveArticle(0) }} />

      <div className="flex flex-col md:flex-row gap-3 flex-1 overflow-y-auto md:overflow-hidden min-h-0">

        {/* Left: sections + articles list */}
        <div className="w-full md:w-56 flex-shrink-0 md:overflow-y-auto">
          {filtered.map(section => (
            <div key={section.id} className="mb-3">
              <button
                onClick={() => { setActiveSection(section.id); setActiveArticle(0) }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all text-xs font-semibold ${
                  activeSection === section.id && !search
                    ? "text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                style={activeSection === section.id && !search ? { background: section.color } : {}}>
                <span>{section.icon}</span>
                {pick(section.title)}
              </button>

              <div className="ml-2 mt-1 space-y-0.5">
                {section.articles.map((article, idx) => (
                  <button key={idx}
                    onClick={() => openArticle(section.id, idx)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                      activeSection === section.id && activeArticle === idx
                        ? "font-medium"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                    style={activeSection === section.id && activeArticle === idx
                      ? { color: section.color, background: section.bg }
                      : {}}>
                    {pick(article.title)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: article content */}
        <div className="flex-1 md:overflow-y-auto min-w-0">
          {search && filtered.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm font-medium text-gray-500">{L("Nothing found for")} "{search}"</div>
              <div className="text-xs text-gray-400 mt-1">{L("Try other words")}</div>
            </div>
          ) : search ? (
            // Search results view
            <div className="space-y-3">
              {filtered.map(section => section.articles.map((article, idx) => (
                <div key={`${section.id}-${idx}`} className="card cursor-pointer hover:border-gray-200 transition-all"
                  onClick={() => { setSearch(""); openArticle(section.id, idx) }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{section.icon}</span>
                    <span className="text-[10px] font-medium" style={{ color: section.color }}>{pick(section.title)}</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-800 mb-1">{pick(article.title)}</div>
                  <div className="text-[11px] text-gray-500 line-clamp-2">
                    {pick(article.content).slice(0, 120)}...
                  </div>
                </div>
              )))}
            </div>
          ) : currentArticle ? (
            <div className="card" ref={articleRef} style={{ scrollMarginTop: 8 }}>
              {/* Article header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: currentSection?.bg }}>
                  {currentSection?.icon}
                </div>
                <div>
                  <div className="text-[10px] font-medium mb-0.5" style={{ color: currentSection?.color }}>
                    {currentSection && pick(currentSection.title)}
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{pick(currentArticle.title)}</div>
                </div>
              </div>

              {/* Article body */}
              <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {pick(currentArticle.content).split("\n").map((line, i) => {
                  if (line.startsWith("•")) {
                    return (
                      <div key={i} className="flex items-start gap-2 my-1">
                        <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                        <span>{line.slice(1).trim()}</span>
                      </div>
                    )
                  }
                  if (line.match(/^\d+\./)) {
                    return (
                      <div key={i} className="flex items-start gap-2 my-1">
                        <span className="font-semibold text-gray-400 flex-shrink-0 w-4">{line.match(/^\d+/)[0]}.</span>
                        <span>{line.replace(/^\d+\./, "").trim()}</span>
                      </div>
                    )
                  }
                  if (line === "") return <div key={i} className="h-2" />
                  if (line.endsWith(":") && !line.startsWith(" ")) {
                    return <div key={i} className="font-semibold text-gray-800 mt-3 mb-1">{line}</div>
                  }
                  if (line.startsWith("→")) {
                    return (
                      <div key={i} className="flex items-start gap-2 my-1 text-primary-dark">
                        <span className="flex-shrink-0">→</span>
                        <span>{line.slice(1).trim()}</span>
                      </div>
                    )
                  }
                  return <div key={i} className="my-0.5">{line}</div>
                })}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setActiveArticle(a => Math.max(0, a-1))}
                  disabled={activeArticle === 0}
                  className="btn btn-sm disabled:opacity-30">
                  {L("← Previous")}
                </button>
                <span className="text-[10px] text-gray-400 self-center">
                  {activeArticle+1} / {currentSection?.articles.length}
                </span>
                <button
                  onClick={() => setActiveArticle(a => Math.min((currentSection?.articles.length||1)-1, a+1))}
                  disabled={activeArticle === (currentSection?.articles.length||1)-1}
                  className="btn btn-sm disabled:opacity-30">
                  {L("Next →")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
