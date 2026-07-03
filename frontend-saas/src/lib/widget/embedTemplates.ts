/**
 * Helpers para construir el código embebible del Widget de Vincer.
 * La base pública (dominio) se toma de NEXT_PUBLIC_WIDGET_BASE_URL para poder
 * cambiarla sin tocar código. Cae a NEXT_PUBLIC_API_URL o al origen actual.
 */

export function getWidgetBaseUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_WIDGET_BASE_URL;
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    const apiEnv = process.env.NEXT_PUBLIC_API_URL;
    if (apiEnv) return apiEnv.replace(/\/$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
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
            label: 'Seguimiento por código',
            method: 'GET',
            url: `${base}/api/public/widget/tracking/{codigo}?api_key=${k}`,
            description: 'Estado del servicio a partir del código de seguimiento.',
        },
    ];
}

/** Snippet recomendado: carga el script alojado por Vincer (se actualiza solo). */
export function buildHostedSnippet(key: string, base = getWidgetBaseUrl()): string {
    return [
        '<!-- Widget de Vincer -->',
        '<div id="vincer-widget-root"',
        `     data-vincer-key="${key}"`,
        `     data-vincer-api="${base}"></div>`,
        `<script src="${base}/widget/v1.js" defer></script>`,
    ].join('\n');
}

/**
 * Plantilla completa y autocontenida (HTML + CSS + JS).
 * Para clientes que prefieren pegar todo el código sin depender del script
 * alojado. Muestra Productos, Servicios y Seguimiento.
 */
export function buildStandaloneTemplate(key: string, base = getWidgetBaseUrl()): string {
    return `<!-- ====== Widget Vincer (Productos, Servicios y Seguimiento) ====== -->
<div id="vincer-widget-root"></div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
.vincer-w{--vc:#19B5FE;--vd:#E0B84D;font-family:'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;line-height:1.5;max-width:1120px;margin:0 auto;-webkit-font-smoothing:antialiased}
.vincer-w *{box-sizing:border-box}
.vincer-head{display:flex;align-items:center;gap:12px;margin:0 0 18px}
.vincer-head .vincer-dot{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(25,181,254,.15),rgba(224,184,77,.15));color:var(--vc);flex:none}
.vincer-head h3{font-size:19px;font-weight:800;margin:0;letter-spacing:-.01em}
.vincer-head .vincer-count{margin-left:auto;font-size:12px;font-weight:700;color:#94a3b8;background:#f1f5f9;border-radius:999px;padding:3px 10px}
.vincer-group{margin-bottom:34px}
.vincer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}
.vincer-card{position:relative;border:1px solid #e8edf3;border-radius:18px;background:#fff;padding:18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:transform .25s,box-shadow .25s,border-color .25s;overflow:hidden}
.vincer-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px -12px rgba(15,23,42,.18);border-color:rgba(25,181,254,.45)}
.vincer-thumb{width:100%;height:148px;border-radius:13px;overflow:hidden;background:linear-gradient(135deg,#f1f5f9,#e2e8f0)}
.vincer-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.vincer-card h4{margin:0;font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-.01em}
.vincer-card p{margin:0;font-size:13px;color:#64748b;flex:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.vincer-chips{display:flex;flex-wrap:wrap;gap:6px}
.vincer-chip{font-size:11px;font-weight:600;color:#0369a1;background:rgba(25,181,254,.1);border-radius:999px;padding:3px 9px}
.vincer-foot{display:flex;align-items:center;justify-content:space-between;margin-top:4px;padding-top:12px;border-top:1px solid #f1f5f9}
.vincer-price{font-weight:800;font-size:17px;color:#0f172a}
.vincer-price small{display:block;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em}
.vincer-card.vincer-plan{border-color:rgba(25,181,254,.3)}
.vincer-card.vincer-plan:before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--vc),var(--vd))}
.vincer-tag{align-self:flex-start;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#020210;background:linear-gradient(90deg,var(--vc),var(--vd));border-radius:999px;padding:4px 10px}
.vincer-track-wrap{border-radius:22px;padding:1px;background:linear-gradient(135deg,rgba(25,181,254,.5),rgba(224,184,77,.5));box-shadow:0 24px 50px -20px rgba(25,181,254,.4)}
.vincer-track{border-radius:21px;background:#0b1220;color:#fff;padding:26px;position:relative;overflow:hidden}
.vincer-track:after{content:'';position:absolute;width:280px;height:280px;right:-90px;top:-120px;border-radius:50%;background:radial-gradient(circle,rgba(25,181,254,.25),transparent 70%)}
.vincer-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--vd);margin-bottom:10px}
.vincer-track h4{margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:-.02em}
.vincer-track p{margin:0 0 18px;font-size:14px;color:#94a3b8;max-width:480px}
.vincer-row{display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:1}
.vincer-field{position:relative;flex:1;min-width:200px}
.vincer-field svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748b}
.vincer-row input{width:100%;height:52px;padding:0 14px 0 42px;border:1px solid rgba(255,255,255,.14);border-radius:14px;font-size:15px;background:rgba(255,255,255,.06);color:#fff;font-family:inherit;font-weight:600;outline:none;transition:border-color .2s,box-shadow .2s}
.vincer-row input::placeholder{color:#64748b;font-weight:500}
.vincer-row input:focus{border-color:var(--vc);box-shadow:0 0 0 4px rgba(25,181,254,.18)}
.vincer-row button{height:52px;padding:0 24px;border:0;border-radius:14px;background:linear-gradient(90deg,var(--vc),var(--vd));color:#020210;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.vincer-row button:hover{filter:brightness(1.08)}
.vincer-row button:disabled{opacity:.6;cursor:not-allowed}
.vincer-result{margin-top:18px;position:relative;z-index:1}
.vincer-status{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px 18px}
.vincer-ic{width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--vc),var(--vd));color:#020210}
.vincer-st-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8}
.vincer-st-val{font-size:16px;font-weight:800;color:#fff}
.vincer-st-stage{font-size:13px;color:var(--vc);font-weight:700}
.vincer-msg{font-size:14px;color:#cbd5e1;padding:4px 2px}.vincer-msg.err{color:#fca5a5}
.vincer-empty,.vincer-loading{font-size:14px;color:#94a3b8;padding:10px 0}
.vincer-error{font-size:14px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:14px 16px}
.vincer-brand{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:26px;font-size:11px;font-weight:700;color:#94a3b8}
.vincer-brand b{background:linear-gradient(90deg,var(--vc),var(--vd));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:800}
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
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function card(it,opts){opts=opts||{};var im=opts.withImage?'<div class="vincer-thumb">'+(it.imagen?'<img src="'+esc(it.imagen)+'" alt="'+esc(it.nombre)+'" loading="lazy">':'')+'</div>':"";var tag=opts.isPlan?'<span class="vincer-tag">Plan</span>':"";var ch="";if(it.servicios&&it.servicios.length){ch='<div class="vincer-chips">'+it.servicios.slice(0,4).map(function(s){return '<span class="vincer-chip">'+esc(s)+'</span>';}).join("")+'</div>';}return '<div class="vincer-card'+(opts.isPlan?' vincer-plan':'')+'">'+im+tag+'<h4>'+esc(it.nombre)+'</h4>'+(it.descripcion?'<p>'+esc(it.descripcion)+'</p>':'<p></p>')+ch+'<div class="vincer-foot"><span class="vincer-price"><small>Desde</small>'+clp(it.precio)+'</span></div></div>';}
  function group(t,ic,arr,opts){if(!arr||!arr.length)return "";return '<div class="vincer-group"><div class="vincer-head"><span class="vincer-dot">'+ic+'</span><h3>'+esc(t)+'</h3><span class="vincer-count">'+arr.length+'</span></div><div class="vincer-grid">'+arr.map(function(i){return card(i,opts);}).join("")+'</div></div>';}
  function init(){
    var root=document.getElementById("vincer-widget-root");if(!root)return;
    root.className="vincer-w";
    root.innerHTML='<div class="vincer-products"><p class="vincer-loading">Cargando servicios...</p></div>'+
      '<div class="vincer-track-wrap"><div class="vincer-track"><span class="vincer-eyebrow">'+I_PAW+' Seguimiento en tiempo real</span>'+
      '<h4>Sigue el proceso de tu mascota</h4><p>Ingresa el codigo que te entrego el crematorio para ver el estado del servicio.</p>'+
      '<div class="vincer-row"><div class="vincer-field">'+I_SEARCH+'<input class="vincer-code" type="text" placeholder="Ej: SMROE2STJ4" autocomplete="off"></div><button class="vincer-btn" type="button">'+I_SEARCH+' Buscar</button></div>'+
      '<div class="vincer-result"></div></div></div>'+
      '<div class="vincer-brand">'+I_PAW+' Powered by <b>Vincer</b></div>';
    var prod=root.querySelector(".vincer-products");
    fetch(CFG.api+"/api/public/widget/products-services?api_key="+encodeURIComponent(CFG.key))
      .then(function(r){if(!r.ok)throw 0;return r.json();})
      .then(function(d){var has=(d.plans&&d.plans.length)||(d.services&&d.services.length)||(d.products&&d.products.length);prod.innerHTML=has?(group("Planes",I_STAR,d.plans,{withImage:true,isPlan:true})+group("Servicios",I_TAG,d.services,{})+group("Productos",I_BOX,d.products,{withImage:true})):'<p class="vincer-empty">No hay servicios disponibles.</p>';})
      .catch(function(){prod.innerHTML='<div class="vincer-error">No se pudieron cargar los servicios.</div>';});
    var input=root.querySelector(".vincer-code"),btn=root.querySelector(".vincer-btn"),res=root.querySelector(".vincer-result");
    function go(){var c=(input.value||"").trim();if(!c){res.innerHTML='<div class="vincer-msg">Ingresa tu codigo de seguimiento.</div>';return;}btn.disabled=true;res.innerHTML='<div class="vincer-msg">Buscando...</div>';
      fetch(CFG.api+"/api/public/widget/tracking/"+encodeURIComponent(c)+"?api_key="+encodeURIComponent(CFG.key))
        .then(function(r){if(!r.ok)throw 0;return r.json();})
        .then(function(d){res.innerHTML='<div class="vincer-status"><span class="vincer-ic">'+I_CHECK+'</span><div><div class="vincer-st-label">Estado del servicio</div><div class="vincer-st-val">'+esc(d.status||"En proceso")+'</div>'+(d.etapa?'<div class="vincer-st-stage">Etapa: '+esc(d.etapa)+'</div>':'')+'</div></div>';})
        .catch(function(){res.innerHTML='<div class="vincer-msg err">No encontramos un seguimiento con ese codigo.</div>';})
        .finally(function(){btn.disabled=false;});}
    btn.addEventListener("click",go);input.addEventListener("keydown",function(e){if(e.key==="Enter")go();});
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
})();
</script>`;
}
