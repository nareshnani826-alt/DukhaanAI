// Styles for the public homepage (HomeSections). Always light and warm, like the sign-in card.
export const HOME_CSS = `
  .hm { --k:1; --ink:#1a0c04; --dim:#6b5436; --saff:#d4621f; --saff-deep:#c25500; --line:rgba(26,12,4,0.10);
        color:var(--ink); background:#fffaf5; font-family:'Plus Jakarta Sans',system-ui,sans-serif; }
  /* Zoomed blocks scale themselves, so everything inside them uses the base size */
  .hm-phone *, .hm-s-phone *, .hm-hero-form * { --k:1; }
  .hm-wrap { max-width:calc(1280px * var(--k)); margin:0 auto; padding:0 calc(32px * var(--k)); }
  .hm-progress { position:fixed; top:0; left:0; right:0; height:3px; z-index:40; transform-origin:0 50%;
                 background:linear-gradient(90deg,#e87722,#c25500); }

  /* Nav */
  .hm-nav { position:sticky; top:0; z-index:20; background:rgba(255,250,245,0.88);
            backdrop-filter:blur(calc(10px * var(--k))); -webkit-backdrop-filter:blur(calc(10px * var(--k))); border-bottom:1px solid var(--line);
            transition:box-shadow .25s; }
  .hm-nav.is-scrolled { box-shadow:0 calc(8px * var(--k)) calc(24px * var(--k)) rgba(31,14,3,0.07); }
  .hm-nav-in { display:flex; align-items:center; justify-content:space-between; gap:calc(16px * var(--k)); height:calc(64px * var(--k)); }
  .hm-brand { zoom:var(--k); display:flex; align-items:center; gap:10px; text-decoration:none; }
  .hm-links { display:flex; gap:calc(4px * var(--k)); }
  .hm-links button { position:relative; background:none; border:none; padding:calc(10px * var(--k)) calc(14px * var(--k)); border-radius:calc(10px * var(--k)); cursor:pointer;
                     font:600 calc(14px * var(--k)) 'Plus Jakarta Sans',sans-serif; color:var(--dim); transition:color .15s; }
  .hm-links button:hover, .hm-links button[aria-current] { color:var(--ink); }
  .hm-nav-pill { position:absolute; inset:0; border-radius:calc(10px * var(--k)); background:rgba(212,98,31,0.11); }

  /* Buttons */
  .hm-btn { display:inline-flex; align-items:center; justify-content:center; gap:calc(8px * var(--k)); min-height:calc(48px * var(--k));
            padding:calc(12px * var(--k)) calc(22px * var(--k)); border-radius:calc(12px * var(--k)); font:700 calc(15px * var(--k)) 'Plus Jakarta Sans',sans-serif;
            cursor:pointer; text-decoration:none; border:1.5px solid transparent;
            transition:background-color .15s, border-color .15s, color .15s, transform .12s; }
  .hm-btn:active { transform:scale(0.97); }
  .hm-btn-sm { min-height:calc(40px * var(--k)); padding:calc(8px * var(--k)) calc(16px * var(--k)); font-size:calc(14px * var(--k)); border-radius:calc(10px * var(--k)); }
  .hm-btn-primary { background:var(--saff-deep); color:#fff; }
  .hm-btn-primary:hover { background:#a94a00; }
  .hm-btn-ghost { background:#fff; color:var(--ink); border-color:#ead8c2; }
  .hm-btn-ghost:hover { border-color:var(--saff); color:var(--saff-deep); }
  .hm-btn-onDark { background:transparent; color:#fff6ea; border-color:rgba(255,246,234,0.35); }
  .hm-btn-onDark:hover { border-color:#fff6ea; }
  .hm-mag { display:inline-flex; }

  /* Hero */
  .hm-hero { position:relative; overflow:hidden; padding:calc(56px * var(--k)) 0 calc(72px * var(--k));
             background:linear-gradient(160deg,#fffaf5 0%,#fff1e0 55%,#ffe8cc 100%); }
  .hm-glyphs { position:absolute; inset:0; pointer-events:none; user-select:none;
               font-family:'Tiro Devanagari Hindi',serif; font-weight:700; color:#b4500a; }
  .hm-glyphs span { white-space:nowrap; }
  .hm-hero-grid { position:relative; display:grid; grid-template-columns:1.15fr 1fr; gap:calc(56px * var(--k)); align-items:center; }
  .hm-pill { display:inline-flex; align-items:center; gap:calc(6px * var(--k)); padding:calc(6px * var(--k)) calc(12px * var(--k)); border-radius:calc(999px * var(--k));
             background:#fff; border:1px solid #f0dcc4; color:var(--saff-deep); font-size:calc(13px * var(--k)); font-weight:700; }
  .hm-h1 { font-size:clamp(calc(38px * var(--k)),5.2vw,calc(62px * var(--k))); line-height:1.1; letter-spacing:-1.5px; font-weight:800; margin:calc(18px * var(--k)) 0 calc(18px * var(--k)); }
  .hm-h1-line2 { display:block; }
  .hm-accent, .hm-rot { color:var(--saff); }
  .hm-rot { letter-spacing:0; padding-bottom:.08em; }
  .hm-lead { font-size:calc(18px * var(--k)); line-height:1.65; color:var(--dim); max-width:calc(540px * var(--k)); margin:0 0 calc(28px * var(--k)); }
  .hm-cta-row { display:flex; gap:calc(12px * var(--k)); flex-wrap:wrap; }
  .hm-trust { list-style:none; padding:0; margin:calc(28px * var(--k)) 0 0; display:flex; flex-wrap:wrap; gap:calc(10px * var(--k)) calc(22px * var(--k));
              font-size:calc(14px * var(--k)); font-weight:600; color:var(--dim); }
  .hm-trust li { display:flex; align-items:center; gap:calc(6px * var(--k)); }
  .hm-trust svg { color:#1f7a5e; }
  .hm-hero-form { zoom:var(--k); scroll-margin-top:84px; }  /* zoom already scales this */

  /* Greetings marquee */
  .hm-marquee { overflow:hidden; background:#1f0e03; color:#f6c768; padding:calc(16px * var(--k)) 0;
                -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);
                mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
  .hm-marquee-track { display:flex; width:max-content; animation:hm-marq 42s linear infinite; }
  .hm-marquee:hover .hm-marquee-track { animation-play-state:paused; }
  .hm-marquee span { display:flex; align-items:center; font-family:'Tiro Devanagari Hindi',serif;
                     font-size:calc(22px * var(--k)); font-weight:700; white-space:nowrap; padding-left:calc(36px * var(--k)); }
  .hm-marquee i { font-style:normal; color:var(--saff); margin-left:calc(36px * var(--k)); }
  @keyframes hm-marq { to { transform:translateX(-50%); } }

  /* Stats */
  .hm-stats-band { background:#fff; border-bottom:1px solid var(--line); }
  .hm-stats { display:grid; grid-template-columns:repeat(4,1fr); padding-top:calc(36px * var(--k)); padding-bottom:calc(36px * var(--k)); }
  .hm-stat { text-align:center; padding:calc(6px * var(--k)) calc(14px * var(--k)); border-left:1px solid var(--line); }
  .hm-stat:first-child { border-left:none; }
  .hm-stat-n { font-size:calc(46px * var(--k)); font-weight:800; color:var(--saff-deep); letter-spacing:-1px; line-height:1.1;
               font-variant-numeric:tabular-nums; }
  .hm-stat-l { font-size:calc(14px * var(--k)); color:var(--dim); font-weight:600; margin-top:calc(4px * var(--k)); }

  /* Sections */
  .hm-section { padding:calc(88px * var(--k)) 0; }
  .hm-white { background:#fff; }
  .hm-dark { background:#1f0e03; position:relative; overflow:hidden; }
  .hm-head { text-align:center; max-width:calc(640px * var(--k)); margin:0 auto calc(48px * var(--k)); }
  .hm-kicker { font-size:calc(13px * var(--k)); font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--saff); margin-bottom:calc(10px * var(--k)); }
  .hm-h2 { font-size:clamp(calc(28px * var(--k)),3.6vw,calc(42px * var(--k))); line-height:1.15; letter-spacing:-0.8px; font-weight:800; margin:0 0 calc(14px * var(--k)); }
  .hm-h3 { font-size:calc(18px * var(--k)); font-weight:800; margin:0 0 calc(6px * var(--k)); }
  .hm-sub { font-size:calc(17px * var(--k)); line-height:1.65; color:var(--dim); margin:0; }
  .hm-split { display:grid; grid-template-columns:1fr 1fr; gap:calc(56px * var(--k)); align-items:center; }
  .hm-checks { list-style:none; padding:0; margin:0; display:grid; gap:calc(12px * var(--k)); font-size:calc(15px * var(--k)); font-weight:600; }
  .hm-checks li { display:flex; gap:calc(10px * var(--k)); align-items:flex-start; line-height:1.4; }
  .hm-checks svg { color:#1f7a5e; flex-shrink:0; margin-top:1px; }
  .hm-checks-sm { font-size:calc(14px * var(--k)); gap:calc(10px * var(--k)); margin-bottom:calc(24px * var(--k)); }

  /* Day story */
  .hm-story-section { background:#fffaf5; }
  .hm-story { display:grid; grid-template-columns:1.1fr 1fr; gap:calc(64px * var(--k)); }
  .hm-chapters { position:relative; padding-left:calc(40px * var(--k)); }
  .hm-rail { position:absolute; left:calc(9px * var(--k)); top:0; bottom:0; width:calc(3px * var(--k)); border-radius:3px; background:#efe3d2; overflow:hidden; }
  .hm-rail-fill { position:absolute; inset:0; transform-origin:50% 0; transition:background-color .4s; }
  .hm-chapter { position:relative; min-height:72vh; display:flex; flex-direction:column; justify-content:center; }
  .hm-ch-dot { position:absolute; left:calc(-38px * var(--k)); top:50%; width:calc(17px * var(--k)); height:calc(17px * var(--k)); margin-top:calc(-8.5px * var(--k)); border-radius:50%;
               border:3px solid #fffaf5; transition:background-color .3s; }
  .hm-ch-time { display:flex; align-items:center; gap:calc(6px * var(--k)); font-size:calc(14px * var(--k)); font-weight:800; letter-spacing:.4px; margin-bottom:calc(10px * var(--k)); }
  .hm-ch-title { font-size:clamp(calc(26px * var(--k)),3vw,calc(36px * var(--k))); font-weight:800; letter-spacing:-0.6px; margin:0 0 calc(12px * var(--k)); }
  .hm-chapter .hm-sub { max-width:calc(460px * var(--k)); }
  .hm-ch-screen { display:none; }
  .hm-story-pin { position:sticky; top:calc(50vh - calc(255px * var(--k))); align-self:start; height:calc(510px * var(--k));
                  display:flex; align-items:center; justify-content:center; }
  .hm-s-phone { zoom:var(--k); width:290px; min-height:470px; background:#fffaf5; border:10px solid #1f0e03; border-radius:40px;
                padding:calc(28px * var(--k)) calc(14px * var(--k)) calc(18px * var(--k)); position:relative; box-shadow:0 calc(30px * var(--k)) calc(60px * var(--k)) rgba(31,14,3,0.22); overflow:hidden; }
  .hm-s-bar { display:flex; justify-content:space-between; align-items:center; font-size:calc(12px * var(--k)); font-weight:800; margin:calc(6px * var(--k)) calc(4px * var(--k)) calc(14px * var(--k)); }
  .hm-s-hero { border-radius:calc(14px * var(--k)); padding:calc(14px * var(--k)); margin-bottom:calc(12px * var(--k)); }
  .hm-s-label { font-size:calc(11px * var(--k)); font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#8a7556; margin:calc(4px * var(--k)) calc(4px * var(--k)) calc(8px * var(--k)); }
  .hm-s-row { display:flex; justify-content:space-between; align-items:center; gap:calc(8px * var(--k)); background:#fff;
              border:1px solid var(--line); border-radius:calc(12px * var(--k)); padding:calc(10px * var(--k)) calc(12px * var(--k)); margin-bottom:calc(8px * var(--k)); }
  .hm-s-total { display:flex; justify-content:space-between; font-size:calc(17px * var(--k)); font-weight:800; padding:calc(6px * var(--k)) calc(4px * var(--k)) calc(10px * var(--k)); }
  .hm-s-chip { display:flex; align-items:center; justify-content:center; gap:calc(6px * var(--k)); background:#e6f3ee; color:#1f7a5e;
               font-size:calc(12px * var(--k)); font-weight:800; border-radius:calc(10px * var(--k)); padding:calc(9px * var(--k)); }
  .hm-s-bars { display:flex; align-items:flex-end; gap:calc(8px * var(--k)); height:calc(96px * var(--k)); padding:calc(4px * var(--k)) calc(4px * var(--k)) calc(12px * var(--k)); }
  .hm-s-bars > div { flex:1; border-radius:calc(5px * var(--k)) calc(5px * var(--k)) 2px 2px; }

  /* Bento */
  .hm-bento { display:grid; grid-template-columns:repeat(3,1fr); gap:calc(18px * var(--k)); }
  .hm-card { position:relative; overflow:hidden; background:#fffaf5; border:1px solid var(--line); border-radius:calc(18px * var(--k)); padding:calc(26px * var(--k));
             display:flex; flex-direction:column; justify-content:space-between; gap:calc(28px * var(--k)); min-height:calc(220px * var(--k));
             transition:border-color .2s; }
  .hm-card:hover { border-color:rgba(212,98,31,0.45); }
  .hm-card.is-wide { grid-column:span 2; background:linear-gradient(135deg,#fffaf5 0%,#fff1e0 100%); }
  .hm-spot { position:absolute; inset:0; pointer-events:none; }
  .hm-card-icon { position:relative; width:calc(46px * var(--k)); height:calc(46px * var(--k)); border-radius:calc(12px * var(--k)); display:flex; align-items:center; justify-content:center;
                  background:rgba(212,98,31,0.10); color:var(--saff-deep); }
  .hm-card-text { font-size:calc(15px * var(--k)); line-height:1.6; color:var(--dim); margin:0; max-width:calc(520px * var(--k)); }

  /* Steps */
  .hm-steps { list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(3,1fr); gap:calc(24px * var(--k)); position:relative; }
  .hm-steps-line { position:absolute; top:calc(24px * var(--k)); left:17%; right:17%; height:2px; transform-origin:0 50%;
                   background:repeating-linear-gradient(90deg,#d4621f 0 calc(8px * var(--k)),transparent calc(8px * var(--k)) calc(15px * var(--k))); }
  .hm-step { text-align:center; padding:0 calc(12px * var(--k)); }
  .hm-step .hm-card-text { margin:0 auto; max-width:calc(300px * var(--k)); }
  .hm-step-n { position:relative; width:calc(48px * var(--k)); height:calc(48px * var(--k)); margin:0 auto calc(20px * var(--k)); border-radius:50%; background:var(--saff-deep); color:#fff;
               display:flex; align-items:center; justify-content:center; font-size:calc(18px * var(--k)); font-weight:800; box-shadow:0 0 0 calc(8px * var(--k)) #fffaf5; }

  /* Pricing */
  .hm-plans { max-width:calc(860px * var(--k)); margin:0 auto; display:grid; grid-template-columns:repeat(2,1fr); gap:calc(18px * var(--k)); align-items:stretch; }
  .hm-plan { position:relative; background:#fff; border:1px solid var(--line); border-radius:calc(20px * var(--k)); padding:calc(28px * var(--k)); }
  .hm-plan.is-popular { border:2px solid var(--saff); box-shadow:0 calc(18px * var(--k)) calc(40px * var(--k)) rgba(194,85,0,0.14); }
  .hm-plan-glow { position:absolute; inset:0; border-radius:inherit; pointer-events:none;
                  background:linear-gradient(180deg,#fff2e2 0%,#fffaf5 60%); box-shadow:inset 0 0 0 1.5px rgba(212,98,31,0.45); }
  .hm-plan-tag { position:absolute; top:calc(-13px * var(--k)); left:calc(28px * var(--k)); z-index:1; background:var(--saff-deep); color:#fff;
                 font-size:calc(12px * var(--k)); font-weight:800; padding:calc(4px * var(--k)) calc(12px * var(--k)); border-radius:calc(999px * var(--k)); }

  /* FAQ */
  .hm-faq { max-width:calc(760px * var(--k)); margin:0 auto; display:grid; gap:calc(10px * var(--k)); }
  .hm-faq-item { background:#fff; border:1px solid var(--line); border-radius:calc(14px * var(--k)); transition:border-color .2s; }
  .hm-faq-item.is-open { border-color:rgba(212,98,31,0.45); }
  .hm-faq-q { width:100%; min-height:calc(58px * var(--k)); display:flex; justify-content:space-between; align-items:center; gap:calc(16px * var(--k));
              padding:calc(16px * var(--k)) calc(20px * var(--k)); background:none; border:none; cursor:pointer; text-align:left;
              font:700 calc(16px * var(--k)) 'Plus Jakarta Sans',sans-serif; color:var(--ink); }
  .hm-faq-a { margin:0; padding:0 calc(20px * var(--k)) calc(18px * var(--k)); font-size:calc(15px * var(--k)); line-height:1.65; color:var(--dim); }

  /* Final CTA + footer */
  .hm-blob { position:absolute; width:calc(520px * var(--k)); height:calc(520px * var(--k)); border-radius:50%; filter:blur(calc(90px * var(--k))); pointer-events:none; }
  .hm-blob-1 { background:#c25500; opacity:.45; top:-220px; left:-140px; animation:hm-float 14s ease-in-out infinite alternate; }
  .hm-blob-2 { background:#7c5cbf; opacity:.28; bottom:-280px; right:-160px; animation:hm-float 18s ease-in-out infinite alternate-reverse; }
  @keyframes hm-float { to { transform:translate(calc(140px * var(--k)),calc(70px * var(--k))) scale(1.15); } }
  .hm-final { text-align:center; max-width:calc(640px * var(--k)); margin:0 auto; }
  .hm-final-h { color:#fff6ea; font-size:clamp(calc(34px * var(--k)),4.8vw,calc(58px * var(--k))); }
  .hm-final .hm-sub { margin-bottom:calc(28px * var(--k)); }
  .hm-footer { background:#1f0e03; border-top:1px solid rgba(255,246,234,0.08); color:#cdb592; font-size:calc(14px * var(--k)); }
  .hm-footer-in { display:flex; justify-content:space-between; align-items:center; gap:calc(16px * var(--k)); padding-top:calc(24px * var(--k)); padding-bottom:calc(28px * var(--k)); flex-wrap:wrap; }
  .hm-footer a { color:#f6c768; text-decoration:none; }
  .hm-dock { display:none; }

  /* Voice demo phone */
  .hm-phone { zoom:var(--k); width:300px; max-width:100%; background:#fffaf5; border:10px solid #1f0e03; border-radius:40px;
              padding:calc(26px * var(--k)) calc(18px * var(--k)) calc(20px * var(--k)); position:relative; box-shadow:0 calc(30px * var(--k)) calc(60px * var(--k)) rgba(31,14,3,0.22); }
  .hm-phone-notch { position:absolute; top:8px; left:50%; transform:translateX(-50%); width:84px; height:18px;
                    border-radius:calc(10px * var(--k)); background:#1f0e03; }
  .hm-phone-head { display:flex; justify-content:space-between; align-items:center; font-size:calc(15px * var(--k)); margin:calc(8px * var(--k)) 0 calc(16px * var(--k)); }
  .hm-live { display:flex; align-items:center; gap:calc(6px * var(--k)); font-size:calc(11px * var(--k)); font-weight:700; color:#1f7a5e; }
  .hm-live-dot { width:calc(7px * var(--k)); height:calc(7px * var(--k)); border-radius:50%; background:#1f7a5e; animation:pulse-dot 1.4s ease-in-out infinite; }
  .hm-mic { width:calc(38px * var(--k)); height:calc(38px * var(--k)); border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center;
            background:#f1e4d3; color:var(--dim); transition:background-color .2s, color .2s; }
  .hm-mic.is-on { background:var(--saff-deep); color:#fff; animation:voice-ring-saff 1.6s ease-out infinite; }
  @keyframes voice-ring-saff { 0% { box-shadow:0 0 0 0 rgba(194,85,0,.45) } 100% { box-shadow:0 0 0 calc(12px * var(--k)) rgba(194,85,0,0) } }
  .hm-bubble { background:#fff; border:1px solid #f0dcc4; border-radius:calc(14px * var(--k)) calc(14px * var(--k)) calc(14px * var(--k)) calc(4px * var(--k)); padding:calc(8px * var(--k)) calc(12px * var(--k));
               font-size:calc(14px * var(--k)); font-weight:700; color:var(--ink); }
  .hm-bill { background:#fff; border:1px solid var(--line); border-radius:calc(14px * var(--k)); padding:calc(6px * var(--k)) calc(12px * var(--k)); min-height:calc(168px * var(--k)); }
  .hm-line { display:flex; justify-content:space-between; align-items:center; padding:calc(10px * var(--k)) 0; border-bottom:1px dashed #ead8c2; }
  .hm-line:last-child { border-bottom:none; }
  .hm-empty { font-size:calc(13px * var(--k)); color:#8a7556; text-align:center; padding:calc(58px * var(--k)) 0; }
  .hm-total { display:flex; justify-content:space-between; font-size:calc(20px * var(--k)); font-weight:800; padding:calc(14px * var(--k)) calc(4px * var(--k)) calc(12px * var(--k)); }
  .hm-pay { background:#1f7a5e; color:#fff; text-align:center; border-radius:calc(12px * var(--k)); padding:calc(11px * var(--k)); font-size:calc(13px * var(--k)); font-weight:700; }

  /* Tablet */
  @media (max-width: 960px) {
    .hm-glyphs { display:none; }
    .hm-hero-grid, .hm-split { grid-template-columns:1fr; gap:36px; }
    .hm-hero-form { max-width:460px; width:100%; margin:0 auto; }
    .hm-bento { grid-template-columns:repeat(2,1fr); }
    .hm-card.is-wide:last-child { grid-column:auto; }  /* keeps the 2-column grid even */
    .hm-plans, .hm-steps { grid-template-columns:1fr; max-width:480px; margin-left:auto; margin-right:auto; }
    .hm-steps { gap:32px; }
    .hm-steps-line { display:none; }
    .hm-story { grid-template-columns:1fr; gap:0; }
    .hm-story-pin { display:none; }
    .hm-chapter { min-height:0; padding:28px 0; opacity:1 !important; }
    .hm-ch-dot { top:42px; margin-top:0; }
    .hm-ch-screen { display:flex; justify-content:center; margin-top:22px; }
    .hm-stats { grid-template-columns:repeat(2,1fr); row-gap:24px; }
    .hm-stat:nth-child(3) { border-left:none; }
  }
  /* Phone */
  @media (max-width: 640px) {
    .hm-wrap { padding:0 16px; }
    .hm-links { display:none; }
    .hm-hero { padding:28px 0 44px; }
    .hm-h1 { letter-spacing:-1px; margin:14px 0 12px; }
    .hm-lead { font-size:16px; margin-bottom:20px; }
    .hm-hero-copy .hm-cta-row .hm-mag:first-child { display:none; }  /* the sign-in card sits right below */
    .hm-trust { margin-top:18px; font-size:13px; }
    .hm-marquee span { font-size:18px; padding-left:24px; }
    .hm-marquee i { margin-left:24px; }
    .hm-stat-n { font-size:38px; }
    .hm-stat-l { font-size:13px; }
    .hm-section { padding:60px 0; }
    .hm-head { margin-bottom:32px; }
    .hm-bento { grid-template-columns:1fr; }
    .hm-card.is-wide { grid-column:auto; }
    .hm-card { min-height:0; gap:18px; padding:22px; }
    .hm-chapters { padding-left:30px; }
    .hm-rail { left:6px; }
    .hm-ch-dot { left:-31px; }
    .hm-cta-row .hm-mag { flex:1 1 100%; }
    .hm-cta-row .hm-btn { width:100%; }
    .hm-faq-q { font-size:15px; padding:14px 16px; }
    .hm-faq-a { padding:0 16px 16px; }
    .hm-footer { padding-bottom:84px; }
    .hm-dock { display:flex; gap:8px; position:fixed; left:12px; right:12px; z-index:30;
               bottom:calc(12px + env(safe-area-inset-bottom, 0px)); padding:8px; border-radius:16px;
               background:rgba(255,250,245,0.94); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
               border:1px solid var(--line); box-shadow:0 10px 30px rgba(31,14,3,0.18); }
    .hm-dock .hm-btn-primary { flex:1; }
    .hm-dock .hm-btn-ghost { width:52px; padding:0; flex-shrink:0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hm-mic.is-on, .hm-live-dot, .hm-marquee-track, .hm-blob { animation:none; }
  }
`
