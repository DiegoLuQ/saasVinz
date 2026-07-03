/* =========================================================================
 * Vincer · Widget Embebible v1
 * -------------------------------------------------------------------------
 * Uso (lo genera el panel admin en Widgets Web):
 *
 *   <div id="vincer-widget-root"
 *        data-vincer-key="pk_vincer_live_xxx"
 *        data-vincer-api="https://app.vincer.cl"></div>
 *   <script src="https://app.vincer.cl/widget/v1.js" defer></script>
 *
 * Autoejecutable (IIFE). Estilos prefijados .vincer- e inyectados una vez.
 * ========================================================================= */
(function () {
    "use strict";

    var STYLE_ID = "vincer-widget-styles";
    var CELESTE = "#19B5FE";
    var DORADO = "#E0B84D";

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var css = [
            "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');",
            ".vincer-w{--vc:" + CELESTE + ";--vd:" + DORADO + ";font-family:'Plus Jakarta Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;line-height:1.5;max-width:1120px;margin:0 auto;-webkit-font-smoothing:antialiased}",
            ".vincer-w *{box-sizing:border-box}",
            /* Section header */
            ".vincer-head{display:flex;align-items:center;gap:12px;margin:0 0 18px}",
            ".vincer-head .vincer-dot{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(25,181,254,.15),rgba(224,184,77,.15));color:var(--vc);flex:none}",
            ".vincer-head h3{font-size:19px;font-weight:800;margin:0;letter-spacing:-.01em}",
            ".vincer-head .vincer-count{margin-left:auto;font-size:12px;font-weight:700;color:#94a3b8;background:#f1f5f9;border-radius:999px;padding:3px 10px}",
            ".vincer-group{margin-bottom:34px}",
            ".vincer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}",
            /* Cards */
            ".vincer-card{position:relative;border:1px solid #e8edf3;border-radius:18px;background:#fff;padding:18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;overflow:hidden}",
            ".vincer-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px -12px rgba(15,23,42,.18);border-color:rgba(25,181,254,.45)}",
            ".vincer-card .vincer-thumb{position:relative;width:100%;height:148px;border-radius:13px;overflow:hidden;background:linear-gradient(135deg,#f1f5f9,#e2e8f0)}",
            ".vincer-card .vincer-thumb img{width:100%;height:100%;object-fit:cover;display:block}",
            ".vincer-card h4{margin:0;font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-.01em}",
            ".vincer-card p{margin:0;font-size:13px;color:#64748b;flex:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
            ".vincer-chips{display:flex;flex-wrap:wrap;gap:6px}",
            ".vincer-chip{font-size:11px;font-weight:600;color:#0369a1;background:rgba(25,181,254,.1);border-radius:999px;padding:3px 9px}",
            ".vincer-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;padding-top:12px;border-top:1px solid #f1f5f9}",
            ".vincer-price{font-weight:800;font-size:17px;color:#0f172a}",
            ".vincer-price small{display:block;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em}",
            /* Plan (destacado) */
            ".vincer-card.vincer-plan{border-color:rgba(25,181,254,.3)}",
            ".vincer-card.vincer-plan:before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--vc),var(--vd))}",
            ".vincer-tag{align-self:flex-start;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#020210;background:linear-gradient(90deg,var(--vc),var(--vd));border-radius:999px;padding:4px 10px}",
            /* Tracking */
            ".vincer-track-wrap{border-radius:22px;padding:1px;background:linear-gradient(135deg,rgba(25,181,254,.5),rgba(224,184,77,.5));box-shadow:0 24px 50px -20px rgba(25,181,254,.4)}",
            ".vincer-track{border-radius:21px;background:#0b1220;color:#fff;padding:26px;position:relative;overflow:hidden}",
            ".vincer-track:after{content:'';position:absolute;width:280px;height:280px;right:-90px;top:-120px;border-radius:50%;background:radial-gradient(circle,rgba(25,181,254,.25),transparent 70%);pointer-events:none}",
            ".vincer-track .vincer-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--vd);margin-bottom:10px}",
            ".vincer-track h4{margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:-.02em}",
            ".vincer-track p{margin:0 0 18px;font-size:14px;color:#94a3b8;max-width:480px}",
            ".vincer-row{display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:1}",
            ".vincer-field{position:relative;flex:1;min-width:200px}",
            ".vincer-field svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748b}",
            ".vincer-row input{width:100%;height:52px;padding:0 14px 0 42px;border:1px solid rgba(255,255,255,.14);border-radius:14px;font-size:15px;background:rgba(255,255,255,.06);color:#fff;font-family:inherit;font-weight:600;letter-spacing:.04em;outline:none;transition:border-color .2s,box-shadow .2s}",
            ".vincer-row input::placeholder{color:#64748b;letter-spacing:normal;font-weight:500}",
            ".vincer-row input:focus{border-color:var(--vc);box-shadow:0 0 0 4px rgba(25,181,254,.18)}",
            ".vincer-row button{height:52px;padding:0 24px;border:0;border-radius:14px;background:linear-gradient(90deg,var(--vc),var(--vd));color:#020210;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:filter .2s,transform .1s}",
            ".vincer-row button:hover{filter:brightness(1.08)}",
            ".vincer-row button:active{transform:scale(.98)}",
            ".vincer-row button:disabled{opacity:.6;cursor:not-allowed}",
            ".vincer-result{margin-top:18px;position:relative;z-index:1}",
            ".vincer-status{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px 18px}",
            ".vincer-status .vincer-ic{width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--vc),var(--vd));color:#020210}",
            ".vincer-status .vincer-st-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8}",
            ".vincer-status .vincer-st-val{font-size:16px;font-weight:800;color:#fff}",
            ".vincer-status .vincer-st-stage{font-size:13px;color:var(--vc);font-weight:700}",
            ".vincer-msg{font-size:14px;color:#cbd5e1;padding:4px 2px}",
            ".vincer-msg.err{color:#fca5a5}",
            /* Estados base */
            ".vincer-empty,.vincer-loading{font-size:14px;color:#94a3b8;padding:10px 0}",
            ".vincer-skel{border:1px solid #e8edf3;border-radius:18px;height:230px;background:linear-gradient(100deg,#f8fafc 30%,#eef2f7 50%,#f8fafc 70%);background-size:200% 100%;animation:vincer-sk 1.2s infinite}",
            "@keyframes vincer-sk{0%{background-position:200% 0}100%{background-position:-200% 0}}",
            ".vincer-error-box{font-size:14px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:14px 16px}",
            /* Footer marca */
            ".vincer-brand{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:26px;font-size:11px;font-weight:700;color:#94a3b8}",
            ".vincer-brand b{background:linear-gradient(90deg,var(--vc),var(--vd));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:800}"
        ].join("");
        var style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    var ICON_SEARCH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    var ICON_PAW = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="11" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="11" r="2"/><path d="M12 11c-2.5 0-4.5 2-4.5 4 0 1.6 1.2 2.5 2.7 2.5.9 0 1.2-.4 1.8-.4s.9.4 1.8.4c1.5 0 2.7-.9 2.7-2.5 0-2-2-4-4.5-4z"/></svg>';
    var ICON_CHECK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    var ICON_TAG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v5l9 9 5-5-9-9H3z"/><circle cx="7" cy="11" r="1.5" fill="currentColor" stroke="none"/></svg>';
    var ICON_BOX = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>';
    var ICON_STAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.6 6.3L21 9l-4.8 4.2L17.6 20 12 16.5 6.4 20l1.4-6.8L3 9l6.4-.7z"/></svg>';

    function clp(v) {
        if (v === null || v === undefined || isNaN(v)) return "Consultar";
        try { return "$" + Number(v).toLocaleString("es-CL"); } catch (e) { return "$" + v; }
    }
    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function card(item, opts) {
        opts = opts || {};
        var thumb = opts.withImage
            ? '<div class="vincer-thumb">' + (item.imagen ? '<img src="' + esc(item.imagen) + '" alt="' + esc(item.nombre) + '" loading="lazy">' : '') + '</div>'
            : "";
        var tag = opts.isPlan ? '<span class="vincer-tag">Plan</span>' : "";
        var chips = "";
        if (item.servicios && item.servicios.length) {
            chips = '<div class="vincer-chips">' + item.servicios.slice(0, 4).map(function (s) {
                return '<span class="vincer-chip">' + esc(s) + '</span>';
            }).join("") + '</div>';
        }
        return (
            '<div class="vincer-card' + (opts.isPlan ? ' vincer-plan' : '') + '">' +
            thumb + tag +
            '<h4>' + esc(item.nombre) + '</h4>' +
            (item.descripcion ? '<p>' + esc(item.descripcion) + '</p>' : '<p></p>') +
            chips +
            '<div class="vincer-foot"><span class="vincer-price"><small>Desde</small>' + clp(item.precio) + '</span></div>' +
            '</div>'
        );
    }

    function group(title, icon, items, opts) {
        if (!items || !items.length) return "";
        return (
            '<div class="vincer-group">' +
            '<div class="vincer-head"><span class="vincer-dot">' + icon + '</span><h3>' + esc(title) + '</h3>' +
            '<span class="vincer-count">' + items.length + '</span></div>' +
            '<div class="vincer-grid">' +
            items.map(function (it) { return card(it, opts); }).join("") +
            '</div></div>'
        );
    }

    function renderCatalog(container, data) {
        var hasAny = (data.plans && data.plans.length) || (data.services && data.services.length) || (data.products && data.products.length);
        if (!hasAny) {
            container.innerHTML = '<p class="vincer-empty">No hay servicios públicos disponibles por ahora.</p>';
            return;
        }
        container.innerHTML =
            group("Planes", ICON_STAR, data.plans, { withImage: true, isPlan: true }) +
            group("Servicios", ICON_TAG, data.services, {}) +
            group("Productos", ICON_BOX, data.products, { withImage: true });
    }

    function skeleton() {
        return '<div class="vincer-group"><div class="vincer-head"><span class="vincer-dot">' + ICON_TAG +
            '</span><h3>Cargando servicios…</h3></div><div class="vincer-grid">' +
            '<div class="vincer-skel"></div><div class="vincer-skel"></div><div class="vincer-skel"></div></div></div>';
    }

    function setupTracking(section, cfg) {
        var input = section.querySelector(".vincer-code");
        var button = section.querySelector(".vincer-btn");
        var result = section.querySelector(".vincer-result");
        if (!input || !button) return;

        function search() {
            var code = (input.value || "").trim();
            if (!code) { result.innerHTML = '<div class="vincer-msg">Ingresa tu código de seguimiento.</div>'; return; }
            button.disabled = true;
            result.innerHTML = '<div class="vincer-msg">Buscando…</div>';
            fetch(cfg.api + "/api/public/widget/tracking/" + encodeURIComponent(code) + "?api_key=" + encodeURIComponent(cfg.key))
                .then(function (r) { if (!r.ok) throw new Error("nf"); return r.json(); })
                .then(function (d) {
                    result.innerHTML =
                        '<div class="vincer-status"><span class="vincer-ic">' + ICON_CHECK + '</span>' +
                        '<div><div class="vincer-st-label">Estado del servicio</div>' +
                        '<div class="vincer-st-val">' + esc(d.status || "En proceso") + '</div>' +
                        (d.etapa ? '<div class="vincer-st-stage">Etapa: ' + esc(d.etapa) + '</div>' : '') +
                        '</div></div>';
                })
                .catch(function () {
                    result.innerHTML = '<div class="vincer-msg err">No encontramos un seguimiento con ese código. Revísalo e inténtalo de nuevo.</div>';
                })
                .finally(function () { button.disabled = false; });
        }
        button.addEventListener("click", search);
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") search(); });
    }

    function init() {
        var container = document.getElementById("vincer-widget-root");
        if (!container) return;

        var cfg = {
            key: container.getAttribute("data-vincer-key") || "",
            api: (container.getAttribute("data-vincer-api") || "").replace(/\/$/, "")
        };

        injectStyles();
        container.className = "vincer-w";
        container.innerHTML =
            '<div class="vincer-products-section">' + skeleton() + '</div>' +
            '<div class="vincer-track-wrap"><div class="vincer-track vincer-tracking-section">' +
            '<span class="vincer-eyebrow">' + ICON_PAW + ' Seguimiento en tiempo real</span>' +
            '<h4>Sigue el proceso de tu mascota</h4>' +
            '<p>Ingresa el código que te entregó el crematorio para ver el estado del servicio.</p>' +
            '<div class="vincer-row"><div class="vincer-field">' + ICON_SEARCH +
            '<input class="vincer-code" type="text" inputmode="text" placeholder="Ej: SMROE2STJ4" autocomplete="off"></div>' +
            '<button class="vincer-btn" type="button">' + ICON_SEARCH + ' Buscar</button></div>' +
            '<div class="vincer-result"></div>' +
            '</div></div>' +
            '<div class="vincer-brand">' + ICON_PAW + ' Powered by <b>Vincer</b></div>';

        var productsSection = container.querySelector(".vincer-products-section");
        var trackingSection = container.querySelector(".vincer-tracking-section");

        if (!cfg.key) {
            productsSection.innerHTML = '<div class="vincer-error-box">Falta configurar la API key del widget.</div>';
            return;
        }

        fetch(cfg.api + "/api/public/widget/products-services?api_key=" + encodeURIComponent(cfg.key))
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
            .then(function (data) { renderCatalog(productsSection, data); })
            .catch(function (err) {
                productsSection.innerHTML = '<div class="vincer-error-box">No se pudieron cargar los servicios en este momento.</div>';
                if (window.console) console.error("[Vincer Widget]", err);
            });

        setupTracking(trackingSection, cfg);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
