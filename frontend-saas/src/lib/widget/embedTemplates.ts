/**
 * Helpers para construir el código embebible del Widget de Vinzer.
 * La base pública (dominio) se toma de NEXT_PUBLIC_WIDGET_BASE_URL para poder
 * cambiarla sin tocar código. Cae a NEXT_PUBLIC_API_URL o al origen actual.
 */

export function getWidgetBaseUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_WIDGET_BASE_URL;
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    if (process.env.NODE_ENV === 'production') return 'https://app.vinzer.cl';
    if (typeof window !== 'undefined') {
        return window.location.origin.replace('//admin.', '//app.');
    }
    const apiEnv = process.env.NEXT_PUBLIC_API_URL;
    if (apiEnv) return apiEnv.replace(/\/$/, '');
    return 'http://app.lvh.me:3000';
}

export interface WidgetEndpoint {
    label: string;
    method: string;
    url: string;
    description: string;
}

/** Endpoints públicos que el tenant puede consumir con su API key. */
export function getWidgetEndpoints(key: string, base = getWidgetBaseUrl()): WidgetEndpoint[] {
    const k = encodeURIComponent(key);
    return [
        {
            label: 'Productos y Servicios',
            method: 'GET',
            url: `${base}/api/public/widget/products-services?api_key=${k}`,
            description: 'Devuelve planes, servicios y productos activos del crematorio.',
        },
        {
            label: 'Últimas Mascotas (En Memoria)',
            method: 'GET',
            url: `${base}/api/public/widget/recent-pets?limit=8&api_key=${k}`,
            description: 'Últimas mascotas acompañadas con foto, nombre y fecha de fallecimiento (si la tiene).',
        },
        {
            label: 'Seguimiento por código',
            method: 'GET',
            url: `${base}/api/public/widget/tracking/{codigo}?api_key=${k}`,
            description: 'Estado del servicio, etapa actual, progreso y enlace al portal en vivo.',
        },
    ];
}

/** Snippet recomendado: carga el script alojado por Vinzer (se actualiza solo). */
export function buildHostedSnippet(key: string, base = getWidgetBaseUrl()): string {
    return [
        '<!-- Widget de Vinzer (Catálogo y Seguimiento) -->',
        '<div id="vinzer-widget-root"',
        `     data-vinzer-key="${key}"`,
        `     data-vinzer-api="${base}"></div>`,
        `<script src="${base}/widget/v1.js" defer></script>`,
    ].join('\n');
}

/** Snippet ligero para el nuevo widget de Últimas Mascotas ("En Memoria"). */
export function buildRecentPetsSnippet(
    key: string,
    base = getWidgetBaseUrl(),
    limit = 8,
): string {
    return [
        '<!-- Widget de Vinzer · Últimas Mascotas (En Memoria) -->',
        '<div id="vinzer-pets-widget"',
        '     data-vinzer-section="pets"',
        `     data-vinzer-limit="${limit}"`,
        `     data-vinzer-key="${key}"`,
        `     data-vinzer-api="${base}"></div>`,
        `<script src="${base}/widget/v1.js" defer></script>`,
    ].join('\n');
}

/**
 * Plantilla autocontenida (HTML + CSS + JS) para Últimas Mascotas ("En Memoria").
 * Muestra foto, nombre y fecha de fallecimiento (solo si está registrada).
 */
export function buildRecentPetsStandaloneTemplate(
    key: string,
    base = getWidgetBaseUrl(),
    limit = 8,
): string {
    return `<!-- ====== Widget Vinzer · Últimas Mascotas (En Memoria) ====== -->
<div id="vinzer-pets-widget"></div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.vinzer-w{--vc:#19B5FE;--vcd:#0284C7;--vd:#E0B84D;font-family:'Outfit',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;line-height:1.5;max-width:1120px;margin:0 auto;-webkit-font-smoothing:antialiased}
.vinzer-w *{box-sizing:border-box}
.vinzer-head{display:flex;align-items:center;gap:12px;margin:0 0 18px}
.vinzer-head .vinzer-dot{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(25,181,254,.15),rgba(224,184,77,.15));color:var(--vcd);flex:none}
.vinzer-head h3{font-size:19px;font-weight:800;margin:0;letter-spacing:-.01em;color:#0f172a}
.vinzer-head .vinzer-sub{font-size:12px;color:#64748b;font-weight:500;display:block}
.vinzer-head .vinzer-count{margin-left:auto;font-size:12px;font-weight:700;color:#64748b;background:#f1f5f9;border-radius:999px;padding:3px 10px}
.vinzer-pets-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px}
.vinzer-pet-card{position:relative;border:1px solid #e2e8f0;border-radius:20px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);padding:20px 16px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;box-shadow:0 4px 16px -4px rgba(15,23,42,.05);transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;overflow:hidden}
.vinzer-pet-card:hover{transform:translateY(-4px);box-shadow:0 16px 34px -12px rgba(2,132,199,.16);border-color:rgba(25,181,254,.45)}
.vinzer-pet-card:before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--vc),var(--vd));opacity:.75}
.vinzer-pet-avatar{width:88px;height:88px;border-radius:50%;padding:3px;background:linear-gradient(135deg,rgba(25,181,254,.45),rgba(224,184,77,.55));box-shadow:0 8px 20px -6px rgba(2,132,199,.2);margin-bottom:4px}
.vinzer-pet-avatar-in{width:100%;height:100%;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);display:flex;align-items:center;justify-content:center;color:#0284c7;border:2px solid #fff}
.vinzer-pet-avatar-in img{width:100%;height:100%;object-fit:cover;display:block}
.vinzer-pet-name{margin:0;font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-.01em;line-height:1.25}
.vinzer-pet-meta{margin:0;font-size:12px;font-weight:500;color:#64748b;text-transform:capitalize}
.vinzer-pet-date{display:inline-flex;align-items:center;gap:5px;margin-top:4px;padding:4px 10px;border-radius:999px;background:#f1f5f9;border:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#475569;letter-spacing:.02em}
.vinzer-pet-date span{color:#eab308}
.vinzer-pet-memlink{margin-top:4px;font-size:11px;font-weight:700;color:var(--vcd);text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.vinzer-pet-memlink:hover{text-decoration:underline}
.vinzer-empty,.vinzer-loading{font-size:14px;color:#94a3b8;padding:10px 0}
.vinzer-error{font-size:14px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:14px 16px}
.vinzer-brand{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:26px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.04em}
.vinzer-brand a{color:#0284C7;text-decoration:none;font-weight:800}
</style>

<script>
(function(){
  var CFG={key:"${key}",api:"${base}",limit:${limit}};
  var I_HEART='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
  var I_PAW='<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="11" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="11" r="2"/><path d="M12 11c-2.5 0-4.5 2-4.5 4 0 1.6 1.2 2.5 2.7 2.5.9 0 1.2-.4 1.8-.4s.9.4 1.8.4c1.5 0 2.7-.9 2.7-2.5 0-2-2-4-4.5-4z"/></svg>';
  var I_PAW_LG='<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="11" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="11" r="2"/><path d="M12 11c-2.5 0-4.5 2-4.5 4 0 1.6 1.2 2.5 2.7 2.5.9 0 1.2-.4 1.8-.4s.9.4 1.8.4c1.5 0 2.7-.9 2.7-2.5 0-2-2-4-4.5-4z"/></svg>';
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function init(){
    var root=document.getElementById("vinzer-pets-widget");if(!root)return;
    root.className="vinzer-w";
    root.innerHTML='<div class="vinzer-pets-box"><p class="vinzer-loading">Cargando homenaje de mascotas…</p></div><div class="vinzer-brand">'+I_PAW+' CON TECNOLOGÍA DE <a href="https://vinzer.cl/?utm_source=widget_pets" target="_blank" rel="noopener noreferrer">Vinzer.</a></div>';
    var box=root.querySelector(".vinzer-pets-box");
    fetch(CFG.api+"/api/public/widget/recent-pets?limit="+CFG.limit+"&api_key="+encodeURIComponent(CFG.key))
      .then(function(r){if(!r.ok)throw 0;return r.json();})
      .then(function(d){
        var arr=(d&&d.mascotas)?d.mascotas:[];
        if(!arr.length){box.innerHTML='<p class="vinzer-empty">Aún no hay mascotas registradas.</p>';return;}
        var html=arr.map(function(p){
          var av=p.imagen?'<img src="'+esc(p.imagen)+'" alt="'+esc(p.nombre)+'" loading="lazy">':I_PAW_LG;
          var meta=[p.especie,p.raza].filter(Boolean).join(" · ");
          var dt=p.fecha_fallecimiento?'<div class="vinzer-pet-date"><span>✦</span> '+esc(p.fecha_fallecimiento)+'</div>':"";
          var ml=p.memorial_url?'<a class="vinzer-pet-memlink" href="'+esc(p.memorial_url)+'" target="_blank" rel="noopener noreferrer">Ver memorial →</a>':"";
          return '<div class="vinzer-pet-card"><div class="vinzer-pet-avatar"><div class="vinzer-pet-avatar-in">'+av+'</div></div><h4 class="vinzer-pet-name">'+esc(p.nombre)+'</h4>'+(meta?'<p class="vinzer-pet-meta">'+esc(meta)+'</p>':'')+dt+ml+'</div>';
        }).join("");
        box.innerHTML='<div class="vinzer-head"><span class="vinzer-dot">'+I_HEART+'</span><div><h3>En Memoria</h3><span class="vinzer-sub">Últimas mascotas acompañadas</span></div><span class="vinzer-count">'+arr.length+'</span></div><div class="vinzer-pets-grid">'+html+'</div>';
      })
      .catch(function(){box.innerHTML='<div class="vinzer-error">No se pudieron cargar las últimas mascotas.</div>';});
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
})();
</script>`;
}

/**
 * Plantilla completa y autocontenida (HTML + CSS + JS).
 * Para clientes que prefieren pegar todo el código sin depender del script
 * alojado. Muestra Productos, Servicios y Seguimiento enriquecido.
 */
export function buildStandaloneTemplate(key: string, base = getWidgetBaseUrl()): string {
    return `<!-- ====== Widget Vinzer (Productos, Servicios y Seguimiento) ====== -->
<div id="vinzer-widget-root"></div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
.vinzer-w{--vc:#19B5FE;--vcd:#0284C7;--vd:#E0B84D;font-family:'Outfit',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;line-height:1.5;max-width:1120px;margin:0 auto;-webkit-font-smoothing:antialiased}
.vinzer-w *{box-sizing:border-box}
.vinzer-head{display:flex;align-items:center;gap:12px;margin:0 0 18px}
.vinzer-head .vinzer-dot{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(25,181,254,.15),rgba(224,184,77,.15));color:var(--vcd);flex:none}
.vinzer-head h3{font-size:19px;font-weight:800;margin:0;letter-spacing:-.01em}
.vinzer-head .vinzer-count{margin-left:auto;font-size:12px;font-weight:700;color:#64748b;background:#f1f5f9;border-radius:999px;padding:3px 10px}
.vinzer-group{margin-bottom:34px}
.vinzer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}
.vinzer-card{position:relative;border:1px solid #e2e8f0;border-radius:18px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);padding:18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 4px 14px -4px rgba(15,23,42,.05);transition:transform .25s,box-shadow .25s,border-color .25s;overflow:hidden}
.vinzer-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px -12px rgba(15,23,42,.16);border-color:rgba(25,181,254,.45)}
.vinzer-thumb{width:100%;height:148px;border-radius:13px;overflow:hidden;background:linear-gradient(135deg,#f1f5f9,#e2e8f0)}
.vinzer-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.vinzer-card h4{margin:0;font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-.01em}
.vinzer-card p{margin:0;font-size:13px;color:#64748b;flex:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.vinzer-chips{display:flex;flex-wrap:wrap;gap:6px}
.vinzer-chip{font-size:11px;font-weight:600;color:#0369a1;background:rgba(25,181,254,.1);border-radius:999px;padding:3px 9px}
.vinzer-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;padding-top:12px;border-top:1px solid #f1f5f9}
.vinzer-price{font-weight:800;font-size:17px;color:#0f172a}
.vinzer-price small{display:block;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em}
.vinzer-cta{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;background:rgba(2,132,199,.09);color:var(--vcd);transition:background .2s,color .2s}
.vinzer-cta:hover{background:var(--vcd);color:#fff}
.vinzer-card.vinzer-plan{border-color:rgba(25,181,254,.35);background:linear-gradient(180deg,#ffffff 0%,#f0f9ff 100%)}
.vinzer-card.vinzer-plan:before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--vc),var(--vd))}
.vinzer-tag{align-self:flex-start;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#020210;background:linear-gradient(90deg,var(--vc),var(--vd));border-radius:999px;padding:4px 10px}
.vinzer-track-wrap{border-radius:22px;padding:1px;background:linear-gradient(135deg,rgba(25,181,254,.5),rgba(224,184,77,.5));box-shadow:0 24px 50px -20px rgba(25,181,254,.4)}
.vinzer-track{border-radius:21px;background:#0b1220;color:#fff;padding:26px;position:relative;overflow:hidden}
.vinzer-track:after{content:'';position:absolute;width:280px;height:280px;right:-90px;top:-120px;border-radius:50%;background:radial-gradient(circle,rgba(25,181,254,.25),transparent 70%)}
.vinzer-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--vd);margin-bottom:10px}
.vinzer-track h4{margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:-.02em}
.vinzer-track p{margin:0 0 18px;font-size:14px;color:#94a3b8;max-width:520px}
.vinzer-row{display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:1}
.vinzer-field{position:relative;flex:1;min-width:200px}
.vinzer-field svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748b}
.vinzer-row input{width:100%;height:52px;padding:0 14px 0 42px;border:1px solid rgba(255,255,255,.14);border-radius:14px;font-size:15px;background:rgba(255,255,255,.06);color:#fff;font-family:inherit;font-weight:600;outline:none;transition:border-color .2s,box-shadow .2s}
.vinzer-row input::placeholder{color:#64748b;font-weight:500}
.vinzer-row input:focus{border-color:var(--vc);box-shadow:0 0 0 4px rgba(25,181,254,.18)}
.vinzer-row button{height:52px;padding:0 24px;border:0;border-radius:14px;background:linear-gradient(90deg,var(--vc),var(--vd));color:#020210;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.vinzer-row button:hover{filter:brightness(1.08)}
.vinzer-row button:disabled{opacity:.6;cursor:not-allowed}
.vinzer-result{margin-top:18px;position:relative;z-index:1}
.vinzer-status{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px}
.vinzer-status-main{display:flex;align-items:center;gap:14px;min-width:200px;flex:1}
.vinzer-ic{width:52px;height:52px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--vc),var(--vd));color:#020210;overflow:hidden;border:2px solid rgba(25,181,254,.45)}
.vinzer-ic img{width:100%;height:100%;object-fit:cover;display:block}
.vinzer-st-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8}
.vinzer-st-val{font-size:17px;font-weight:800;color:#fff}
.vinzer-st-stage{font-size:13px;color:var(--vc);font-weight:700;margin-top:2px}
.vinzer-prog{width:100%;max-width:220px;height:6px;background:rgba(255,255,255,.1);border-radius:999px;overflow:hidden;margin-top:8px}
.vinzer-prog-bar{height:100%;background:linear-gradient(90deg,var(--vc),#10b981);border-radius:999px}
.vinzer-track-link{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:12px;background:rgba(25,181,254,.16);border:1px solid rgba(25,181,254,.4);color:#38bdf8;font-size:13px;font-weight:700;text-decoration:none;transition:all .2s;white-space:nowrap}
.vinzer-track-link:hover{background:var(--vc);color:#020210;border-color:var(--vc)}
.vinzer-msg{font-size:14px;color:#cbd5e1;padding:4px 2px}.vinzer-msg.err{color:#fca5a5}
.vinzer-empty,.vinzer-loading{font-size:14px;color:#94a3b8;padding:10px 0}
.vinzer-error{font-size:14px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:14px 16px}
.vinzer-brand{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:26px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.04em}
.vinzer-brand a{color:#0284C7;text-decoration:none;font-weight:800}
</style>

<script>
(function(){
  var CFG={key:"${key}",api:"${base}"};
  var I_SEARCH='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  var I_PAW='<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="11" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="11" r="2"/><path d="M12 11c-2.5 0-4.5 2-4.5 4 0 1.6 1.2 2.5 2.7 2.5.9 0 1.2-.4 1.8-.4s.9.4 1.8.4c1.5 0 2.7-.9 2.7-2.5 0-2-2-4-4.5-4z"/></svg>';
  var I_CHECK='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var I_TAG='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v5l9 9 5-5-9-9H3z"/></svg>';
  var I_BOX='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>';
  var I_STAR='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.6 6.3L21 9l-4.8 4.2L17.6 20 12 16.5 6.4 20l1.4-6.8L3 9l6.4-.7z"/></svg>';
  function clp(v){if(v==null||isNaN(v))return "Consultar";try{return "$"+Number(v).toLocaleString("es-CL");}catch(e){return "$"+v;}}
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function ctaUrl(t,n){if(!t)return "";if(t.form_url)return t.form_url;if(t.phone){var d=String(t.phone).replace(/\\D/g,"");if(d.length>=8)return "https://wa.me/"+d+"?text="+encodeURIComponent("Hola, me gustaría consultar por: "+(n||"sus servicios"));}return "";}
  function card(it,opts){opts=opts||{};var im=opts.withImage?'<div class="vinzer-thumb">'+(it.imagen?'<img src="'+esc(it.imagen)+'" alt="'+esc(it.nombre)+'" loading="lazy">':'')+'</div>':"";var tag=opts.isPlan?'<span class="vinzer-tag">Plan</span>':"";var ch="";if(it.servicios&&it.servicios.length){ch='<div class="vinzer-chips">'+it.servicios.slice(0,4).map(function(s){return '<span class="vinzer-chip">'+esc(s)+'</span>';}).join("")+'</div>';}var u=ctaUrl(opts.tenant,it.nombre);var cta=u?'<a class="vinzer-cta" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Solicitar →</a>':"";return '<div class="vinzer-card'+(opts.isPlan?' vinzer-plan':'')+'">'+im+tag+'<h4>'+esc(it.nombre)+'</h4>'+(it.descripcion?'<p>'+esc(it.descripcion)+'</p>':'<p></p>')+ch+'<div class="vinzer-foot"><span class="vinzer-price"><small>Desde</small>'+clp(it.precio)+'</span>'+cta+'</div></div>';}
  function group(t,ic,arr,opts){if(!arr||!arr.length)return "";return '<div class="vinzer-group"><div class="vinzer-head"><span class="vinzer-dot">'+ic+'</span><h3>'+esc(t)+'</h3><span class="vinzer-count">'+arr.length+'</span></div><div class="vinzer-grid">'+arr.map(function(i){return card(i,opts);}).join("")+'</div></div>';}
  function init(){
    var root=document.getElementById("vinzer-widget-root");if(!root)return;
    root.className="vinzer-w";
    root.innerHTML='<div class="vinzer-products"><p class="vinzer-loading">Cargando servicios...</p></div>'+
      '<div class="vinzer-track-wrap"><div class="vinzer-track"><span class="vinzer-eyebrow">'+I_PAW+' Seguimiento en tiempo real</span>'+
      '<h4>Sigue el proceso de tu mascota</h4><p>Ingresa el código que te entregó el crematorio para consultar la etapa actual y abrir el portal ceremonial en vivo.</p>'+
      '<div class="vinzer-row"><div class="vinzer-field">'+I_SEARCH+'<input class="vinzer-code" type="text" placeholder="Ej: HNIHLZULB3" autocomplete="off"></div><button class="vinzer-btn" type="button">'+I_SEARCH+' Buscar</button></div>'+
      '<div class="vinzer-result"></div></div></div>'+
      '<div class="vinzer-brand">'+I_PAW+' CON TECNOLOGÍA DE <a href="https://vinzer.cl/?utm_source=widget" target="_blank" rel="noopener noreferrer">Vinzer.</a></div>';
    var prod=root.querySelector(".vinzer-products");
    fetch(CFG.api+"/api/public/widget/products-services?api_key="+encodeURIComponent(CFG.key))
      .then(function(r){if(!r.ok)throw 0;return r.json();})
      .then(function(d){var tn=d.tenant||{};var has=(d.plans&&d.plans.length)||(d.services&&d.services.length)||(d.products&&d.products.length);prod.innerHTML=has?(group("Planes",I_STAR,d.plans,{withImage:true,isPlan:true,tenant:tn})+group("Servicios",I_TAG,d.services,{tenant:tn})+group("Productos",I_BOX,d.products,{withImage:true,tenant:tn})):'<p class="vinzer-empty">No hay servicios disponibles.</p>';})
      .catch(function(){prod.innerHTML='<div class="vinzer-error">No se pudieron cargar los servicios.</div>';});
    var input=root.querySelector(".vinzer-code"),btn=root.querySelector(".vinzer-btn"),res=root.querySelector(".vinzer-result");
    function go(){var c=(input.value||"").trim();if(!c){res.innerHTML='<div class="vinzer-msg">Ingresa tu código de seguimiento.</div>';return;}btn.disabled=true;res.innerHTML='<div class="vinzer-msg">Buscando...</div>';
      fetch(CFG.api+"/api/public/widget/tracking/"+encodeURIComponent(c)+"?api_key="+encodeURIComponent(CFG.key))
        .then(function(r){if(!r.ok)throw 0;return r.json();})
        .then(function(d){
          var av=d.imagen?'<img src="'+esc(d.imagen)+'" alt="'+esc(d.mascota||"Mascota")+'">':I_CHECK;
          var pt=d.mascota?esc(d.mascota)+" · ":"";
          var pr=typeof d.progreso==="number"?Math.max(5,Math.min(100,d.progreso)):0;
          var pb=pr>0?'<div class="vinzer-prog"><div class="vinzer-prog-bar" style="width:'+pr+'%"></div></div>':"";
          var lk=d.tracking_url?'<a class="vinzer-track-link" href="'+esc(d.tracking_url)+'" target="_blank" rel="noopener noreferrer">Ver seguimiento en vivo →</a>':"";
          res.innerHTML='<div class="vinzer-status"><div class="vinzer-status-main"><span class="vinzer-ic">'+av+'</span><div><div class="vinzer-st-label">'+pt+'Estado del servicio</div><div class="vinzer-st-val">'+esc(d.status||"En proceso")+'</div>'+(d.etapa?'<div class="vinzer-st-stage">Etapa actual: '+esc(d.etapa)+'</div>':'')+pb+'</div></div>'+lk+'</div>';
        })
        .catch(function(){res.innerHTML='<div class="vinzer-msg err">No encontramos un seguimiento con ese código.</div>';})
        .finally(function(){btn.disabled=false;});}
    btn.addEventListener("click",go);input.addEventListener("keydown",function(e){if(e.key==="Enter")go();});
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
})();
</script>`;
}

/**
 * Formulario de ingreso incrustable (iframe) — plan ULTRA.
 * El iframe solo carga en los dominios autorizados de la clave (CSP
 * frame-ancestors). El script ajusta el alto con los mensajes que envía el
 * formulario (`{source:'vinzer-form', type:'height'|'scroll-top'}`) y valida
 * origen y ventana emisora. Soporta varios formularios en la misma página.
 */
export type FormEmbedTheme = 'light' | 'dark';

function formEmbedSrc(key: string, base: string, theme: FormEmbedTheme): string {
    return `${base}/embed/form?key=${encodeURIComponent(key)}${theme === 'dark' ? '&theme=dark' : ''}`;
}

function formEmbedIframe(src: string, lazy: boolean): string {
    return `<iframe data-vinzer-form
        src="${src}"
        title="Formulario de ingreso"
        style="width:100%;min-height:480px;border:0;display:block"${lazy ? '\n        loading="lazy"' : ''}></iframe>`;
}

const FORM_EMBED_SCRIPT = `<script>
(function () {
  if (window.__vinzerFormEmbed) return;
  window.__vinzerFormEmbed = true;
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.source !== 'vinzer-form') return;
    var frames = document.querySelectorAll('iframe[data-vinzer-form]');
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      if (f.contentWindow !== e.source || new URL(f.src).origin !== e.origin) continue;
      if (d.type === 'height' && d.height > 0) f.style.height = d.height + 'px';
      if (d.type === 'scroll-top' && f.getBoundingClientRect().top < 0) {
        f.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
})();
</script>`;

const escapeHtml = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fragmento para pegar dentro de una página existente del sitio. */
export function buildFormEmbedSnippet(
    key: string,
    base = getWidgetBaseUrl(),
    theme: FormEmbedTheme = 'light',
): string {
    return `<!-- Formulario de ingreso Vinzer -->
${formEmbedIframe(formEmbedSrc(key, base, theme), true)}
${FORM_EMBED_SCRIPT}`;
}

/**
 * Página HTML completa y lista para publicar (ej. form.mi-crematorio.cl/index.html).
 * Solo contiene el iframe a pantalla completa: el formulario sigue viviendo en
 * Vinzer, así que no hay que mantener nada en el sitio del cliente.
 */
export function buildFormEmbedFullPage(
    key: string,
    base = getWidgetBaseUrl(),
    theme: FormEmbedTheme = 'light',
    tenantName = '',
): string {
    const title = escapeHtml(tenantName ? `Formulario de ingreso · ${tenantName}` : 'Formulario de ingreso');
    const bg = theme === 'dark' ? '#0f172a' : '#f8fafc';
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="robots" content="noindex">
  <style>
    html, body { margin: 0; padding: 0; background: ${bg}; }
    main { max-width: 820px; margin: 0 auto; padding: 16px; }
  </style>
</head>
<body>
  <main>
    ${formEmbedIframe(formEmbedSrc(key, base, theme), false).replace(/\n/g, '\n    ')}
  </main>
  ${FORM_EMBED_SCRIPT.replace(/\n/g, '\n  ')}
</body>
</html>
`;
}
