/* =========================================================================
 * Vinzer · Widget Embebible v1
 * -------------------------------------------------------------------------
 * Modos de uso (generados desde el panel Admin → Widgets Web):
 *
 * 1) Catálogo + Seguimiento (por defecto):
 *   <div id="vinzer-widget-root"
 *        data-vinzer-key="pk_vinzer_live_xxx"
 *        data-vinzer-api="https://app.vinzer.cl"></div>
 *   <script src="https://app.vinzer.cl/widget/v1.js" defer></script>
 *
 * 2) Últimas Mascotas / En Memoria:
 *   <div id="vinzer-pets-widget"
 *        data-vinzer-section="pets"
 *        data-vinzer-limit="8"
 *        data-vinzer-key="pk_vinzer_live_xxx"
 *        data-vinzer-api="https://app.vinzer.cl"></div>
 *   <script src="https://app.vinzer.cl/widget/v1.js" defer></script>
 *
 * Autoejecutable (IIFE). Estilos prefijados .vinzer- e inyectados una vez.
 * ========================================================================= */
(function () {
    "use strict";

    if (window.__vinzerWidgetV1Loaded) return;
    window.__vinzerWidgetV1Loaded = true;

    var STYLE_ID = "vinzer-widget-styles";
    var CELESTE = "#0284C7";
    var CELESTE_BRIGHT = "#19B5FE";
    var DORADO = "#E0B84D";

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var css = [
            "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');",
            ".vinzer-w{--vc:" + CELESTE_BRIGHT + ";--vcd:" + CELESTE + ";--vd:" + DORADO + ";font-family:'Outfit',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;line-height:1.5;max-width:1120px;margin:0 auto;-webkit-font-smoothing:antialiased}",
            ".vinzer-w *{box-sizing:border-box}",
            /* Section header */
            ".vinzer-head{display:flex;align-items:center;gap:12px;margin:0 0 18px}",
            ".vinzer-head .vinzer-dot{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(25,181,254,.15),rgba(224,184,77,.15));color:var(--vcd);flex:none}",
            ".vinzer-head h3{font-size:19px;font-weight:800;margin:0;letter-spacing:-.01em;color:#0f172a}",
            ".vinzer-head .vinzer-sub{font-size:12px;color:#64748b;font-weight:500;margin-left:4px}",
            ".vinzer-head .vinzer-count{margin-left:auto;font-size:12px;font-weight:700;color:#64748b;background:#f1f5f9;border-radius:999px;padding:3px 10px}",
            ".vinzer-group{margin-bottom:34px}",
            ".vinzer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}",
            /* Catalog Cards */
            ".vinzer-card{position:relative;border:1px solid #e2e8f0;border-radius:18px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);padding:18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 4px 14px -4px rgba(15,23,42,.05);transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;overflow:hidden}",
            ".vinzer-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px -12px rgba(15,23,42,.16);border-color:rgba(25,181,254,.5)}",
            ".vinzer-card .vinzer-thumb{position:relative;width:100%;height:148px;border-radius:13px;overflow:hidden;background:linear-gradient(135deg,#f1f5f9,#e2e8f0)}",
            ".vinzer-card .vinzer-thumb img{width:100%;height:100%;object-fit:cover;display:block}",
            ".vinzer-card h4{margin:0;font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-.01em}",
            ".vinzer-card p{margin:0;font-size:13px;color:#64748b;flex:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
            ".vinzer-chips{display:flex;flex-wrap:wrap;gap:6px}",
            ".vinzer-chip{font-size:11px;font-weight:600;color:#0369a1;background:rgba(25,181,254,.1);border-radius:999px;padding:3px 9px}",
            ".vinzer-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;padding-top:12px;border-top:1px solid #f1f5f9}",
            ".vinzer-price{font-weight:800;font-size:17px;color:#0f172a}",
            ".vinzer-price small{display:block;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em}",
            ".vinzer-cta{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;background:rgba(2,132,199,.09);color:var(--vcd);transition:background .2s,color .2s}",
            ".vinzer-cta:hover{background:var(--vcd);color:#fff}",
            /* Plan (destacado) */
            ".vinzer-card.vinzer-plan{border-color:rgba(25,181,254,.35);background:linear-gradient(180deg,#ffffff 0%,#f0f9ff 100%)}",
            ".vinzer-card.vinzer-plan:before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--vc),var(--vd))}",
            ".vinzer-tag{align-self:flex-start;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#020210;background:linear-gradient(90deg,var(--vc),var(--vd));border-radius:999px;padding:4px 10px}",
            /* Tracking */
            ".vinzer-track-wrap{border-radius:22px;padding:1px;background:linear-gradient(135deg,rgba(25,181,254,.5),rgba(224,184,77,.5));box-shadow:0 24px 50px -20px rgba(25,181,254,.35)}",
            ".vinzer-track{border-radius:21px;background:#0b1220;color:#fff;padding:26px;position:relative;overflow:hidden}",
            ".vinzer-track:after{content:'';position:absolute;width:280px;height:280px;right:-90px;top:-120px;border-radius:50%;background:radial-gradient(circle,rgba(25,181,254,.25),transparent 70%);pointer-events:none}",
            ".vinzer-track .vinzer-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--vd);margin-bottom:10px}",
            ".vinzer-track h4{margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:-.02em}",
            ".vinzer-track p{margin:0 0 18px;font-size:14px;color:#94a3b8;max-width:520px}",
            ".vinzer-row{display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:1}",
            ".vinzer-field{position:relative;flex:1;min-width:200px}",
            ".vinzer-field svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#64748b}",
            ".vinzer-row input{width:100%;height:52px;padding:0 14px 0 42px;border:1px solid rgba(255,255,255,.14);border-radius:14px;font-size:15px;background:rgba(255,255,255,.06);color:#fff;font-family:inherit;font-weight:600;letter-spacing:.04em;outline:none;transition:border-color .2s,box-shadow .2s}",
            ".vinzer-row input::placeholder{color:#64748b;letter-spacing:normal;font-weight:500}",
            ".vinzer-row input:focus{border-color:var(--vc);box-shadow:0 0 0 4px rgba(25,181,254,.18)}",
            ".vinzer-row button{height:52px;padding:0 24px;border:0;border-radius:14px;background:linear-gradient(90deg,var(--vc),var(--vd));color:#020210;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:filter .2s,transform .1s}",
            ".vinzer-row button:hover{filter:brightness(1.08)}",
            ".vinzer-row button:active{transform:scale(.98)}",
            ".vinzer-row button:disabled{opacity:.6;cursor:not-allowed}",
            ".vinzer-result{margin-top:18px;position:relative;z-index:1}",
            ".vinzer-status{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px 18px}",
            ".vinzer-status-main{display:flex;align-items:center;gap:14px;min-width:200px;flex:1}",
            ".vinzer-status .vinzer-ic{width:52px;height:52px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--vc),var(--vd));color:#020210;overflow:hidden;border:2px solid rgba(25,181,254,.45)}",
            ".vinzer-status .vinzer-ic img{width:100%;height:100%;object-fit:cover;display:block}",
            ".vinzer-status .vinzer-st-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8}",
            ".vinzer-status .vinzer-st-val{font-size:17px;font-weight:800;color:#fff}",
            ".vinzer-status .vinzer-st-stage{font-size:13px;color:var(--vc);font-weight:700;margin-top:2px}",
            ".vinzer-prog{width:100%;max-width:220px;height:6px;background:rgba(255,255,255,.1);border-radius:999px;overflow:hidden;margin-top:8px}",
            ".vinzer-prog-bar{height:100%;background:linear-gradient(90deg,var(--vc),#10b981);border-radius:999px;transition:width .5s ease}",
            ".vinzer-track-link{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:12px;background:rgba(25,181,254,.16);border:1px solid rgba(25,181,254,.4);color:#38bdf8;font-size:13px;font-weight:700;text-decoration:none;transition:all .2s;white-space:nowrap}",
            ".vinzer-track-link:hover{background:var(--vc);color:#020210;border-color:var(--vc)}",
            ".vinzer-msg{font-size:14px;color:#cbd5e1;padding:4px 2px}",
            ".vinzer-msg.err{color:#fca5a5}",
            /* Recent Pets / Memorial Gallery */
            ".vinzer-pets-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px}",
            ".vinzer-pet-card{position:relative;border:1px solid #e2e8f0;border-radius:20px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);padding:20px 16px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;box-shadow:0 4px 16px -4px rgba(15,23,42,.05);transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;overflow:hidden}",
            ".vinzer-pet-card:hover{transform:translateY(-4px);box-shadow:0 16px 34px -12px rgba(2,132,199,.16);border-color:rgba(25,181,254,.45)}",
            ".vinzer-pet-card:before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--vc),var(--vd));opacity:.75}",
            ".vinzer-pet-avatar{width:88px;height:88px;border-radius:50%;padding:3px;background:linear-gradient(135deg,rgba(25,181,254,.45),rgba(224,184,77,.55));box-shadow:0 8px 20px -6px rgba(2,132,199,.2);margin-bottom:4px}",
            ".vinzer-pet-avatar-in{width:100%;height:100%;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);display:flex;align-items:center;justify-content:center;color:#0284c7;border:2px solid #fff}",
            ".vinzer-pet-avatar-in img{width:100%;height:100%;object-fit:cover;display:block}",
            ".vinzer-pet-name{margin:0;font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-.01em;line-height:1.25}",
            ".vinzer-pet-meta{margin:0;font-size:12px;font-weight:500;color:#64748b;text-transform:capitalize}",
            ".vinzer-pet-date{display:inline-flex;align-items:center;gap:5px;margin-top:4px;padding:4px 10px;border-radius:999px;background:#f1f5f9;border:1px solid #e2e8f0;font-size:11px;font-weight:700;color:#475569;letter-spacing:.02em}",
            ".vinzer-pet-date span{color:#eab308}",
            ".vinzer-pet-memlink{margin-top:4px;font-size:11px;font-weight:700;color:var(--vcd);text-decoration:none;display:inline-flex;align-items:center;gap:4px}",
            ".vinzer-pet-memlink:hover{text-decoration:underline}",
            /* Estados base */
            ".vinzer-empty,.vinzer-loading{font-size:14px;color:#94a3b8;padding:10px 0}",
            ".vinzer-skel{border:1px solid #e8edf3;border-radius:18px;height:210px;background:linear-gradient(100deg,#f8fafc 30%,#eef2f7 50%,#f8fafc 70%);background-size:200% 100%;animation:vinzer-sk 1.2s infinite}",
            "@keyframes vinzer-sk{0%{background-position:200% 0}100%{background-position:-200% 0}}",
            ".vinzer-error-box{font-size:14px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:14px 16px}",
            /* Footer marca */
            ".vinzer-brand{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:26px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.04em}",
            ".vinzer-brand a{color:#0284C7;text-decoration:none;font-weight:800}",
            ".vinzer-brand a:hover{color:#19B5FE}"
        ].join("");
        var style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    var ICON_SEARCH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    var ICON_PAW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="11" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="11" r="2"/><path d="M12 11c-2.5 0-4.5 2-4.5 4 0 1.6 1.2 2.5 2.7 2.5.9 0 1.2-.4 1.8-.4s.9.4 1.8.4c1.5 0 2.7-.9 2.7-2.5 0-2-2-4-4.5-4z"/></svg>';
    var ICON_PAW_LG = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="11" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="11" r="2"/><path d="M12 11c-2.5 0-4.5 2-4.5 4 0 1.6 1.2 2.5 2.7 2.5.9 0 1.2-.4 1.8-.4s.9.4 1.8.4c1.5 0 2.7-.9 2.7-2.5 0-2-2-4-4.5-4z"/></svg>';
    var ICON_CHECK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    var ICON_TAG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v5l9 9 5-5-9-9H3z"/><circle cx="7" cy="11" r="1.5" fill="currentColor" stroke="none"/></svg>';
    var ICON_BOX = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>';
    var ICON_STAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.6 6.3L21 9l-4.8 4.2L17.6 20 12 16.5 6.4 20l1.4-6.8L3 9l6.4-.7z"/></svg>';
    var ICON_HEART = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

    function clp(v) {
        if (v === null || v === undefined || isNaN(v)) return "Consultar";
        try { return "$" + Number(v).toLocaleString("es-CL"); } catch (e) { return "$" + v; }
    }
    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function buildContactUrl(tenantInfo, itemName) {
        if (!tenantInfo) return "";
        if (tenantInfo.form_url) return tenantInfo.form_url;
        if (tenantInfo.phone) {
            var digits = String(tenantInfo.phone).replace(/\D/g, "");
            if (digits.length >= 8) {
                var msg = encodeURIComponent("Hola, me gustaría consultar por: " + (itemName || "sus servicios"));
                return "https://wa.me/" + digits + "?text=" + msg;
            }
        }
        return "";
    }

    function card(item, opts) {
        opts = opts || {};
        var thumb = opts.withImage
            ? '<div class="vinzer-thumb">' + (item.imagen ? '<img src="' + esc(item.imagen) + '" alt="' + esc(item.nombre) + '" loading="lazy">' : '') + '</div>'
            : "";
        var tag = opts.isPlan ? '<span class="vinzer-tag">Plan</span>' : "";
        var chips = "";
        if (item.servicios && item.servicios.length) {
            chips = '<div class="vinzer-chips">' + item.servicios.slice(0, 4).map(function (s) {
                return '<span class="vinzer-chip">' + esc(s) + '</span>';
            }).join("") + '</div>';
        }
        var ctaUrl = buildContactUrl(opts.tenant, item.nombre);
        var ctaHtml = ctaUrl
            ? '<a class="vinzer-cta" href="' + esc(ctaUrl) + '" target="_blank" rel="noopener noreferrer">Solicitar →</a>'
            : '';
        return (
            '<div class="vinzer-card' + (opts.isPlan ? ' vinzer-plan' : '') + '">' +
            thumb + tag +
            '<h4>' + esc(item.nombre) + '</h4>' +
            (item.descripcion ? '<p>' + esc(item.descripcion) + '</p>' : '<p></p>') +
            chips +
            '<div class="vinzer-foot"><span class="vinzer-price"><small>Desde</small>' + clp(item.precio) + '</span>' + ctaHtml + '</div>' +
            '</div>'
        );
    }

    function group(title, icon, items, opts) {
        if (!items || !items.length) return "";
        return (
            '<div class="vinzer-group">' +
            '<div class="vinzer-head"><span class="vinzer-dot">' + icon + '</span><h3>' + esc(title) + '</h3>' +
            '<span class="vinzer-count">' + items.length + '</span></div>' +
            '<div class="vinzer-grid">' +
            items.map(function (it) { return card(it, opts); }).join("") +
            '</div></div>'
        );
    }

    function renderCatalog(container, data) {
        var hasAny = (data.plans && data.plans.length) || (data.services && data.services.length) || (data.products && data.products.length);
        if (!hasAny) {
            container.innerHTML = '<p class="vinzer-empty">No hay servicios públicos disponibles por ahora.</p>';
            return;
        }
        var tenantInfo = data.tenant || {};
        container.innerHTML =
            group("Planes", ICON_STAR, data.plans, { withImage: true, isPlan: true, tenant: tenantInfo }) +
            group("Servicios", ICON_TAG, data.services, { tenant: tenantInfo }) +
            group("Productos", ICON_BOX, data.products, { withImage: true, tenant: tenantInfo });
    }

    function renderRecentPets(container, data) {
        var list = (data && data.mascotas) ? data.mascotas : [];
        if (!list.length) {
            container.innerHTML = '<p class="vinzer-empty">Aún no hay mascotas registradas para mostrar.</p>';
            return;
        }
        var cards = list.map(function (pet) {
            var avatarContent = pet.imagen
                ? '<img src="' + esc(pet.imagen) + '" alt="' + esc(pet.nombre) + '" loading="lazy">'
                : ICON_PAW_LG;
            var metaParts = [];
            if (pet.especie) metaParts.push(pet.especie);
            if (pet.raza) metaParts.push(pet.raza);
            var metaHtml = metaParts.length
                ? '<p class="vinzer-pet-meta">' + esc(metaParts.join(" · ")) + '</p>'
                : '';
            var dateHtml = pet.fecha_fallecimiento
                ? '<div class="vinzer-pet-date" title="Fecha de fallecimiento"><span>✦</span> ' + esc(pet.fecha_fallecimiento) + '</div>'
                : '';
            var memHtml = pet.memorial_url
                ? '<a class="vinzer-pet-memlink" href="' + esc(pet.memorial_url) + '" target="_blank" rel="noopener noreferrer">Ver memorial →</a>'
                : '';
            return (
                '<div class="vinzer-pet-card">' +
                '<div class="vinzer-pet-avatar"><div class="vinzer-pet-avatar-in">' + avatarContent + '</div></div>' +
                '<h4 class="vinzer-pet-name">' + esc(pet.nombre) + '</h4>' +
                metaHtml +
                dateHtml +
                memHtml +
                '</div>'
            );
        }).join("");

        container.innerHTML =
            '<div class="vinzer-group">' +
            '<div class="vinzer-head"><span class="vinzer-dot">' + ICON_HEART + '</span>' +
            '<div><h3>En Memoria</h3><span class="vinzer-sub">Últimas mascotas acompañadas</span></div>' +
            '<span class="vinzer-count">' + list.length + '</span></div>' +
            '<div class="vinzer-pets-grid">' + cards + '</div>' +
            '</div>';
    }

    function skeleton(count) {
        var n = count || 3;
        var skels = "";
        for (var i = 0; i < n; i++) skels += '<div class="vinzer-skel"></div>';
        return '<div class="vinzer-group"><div class="vinzer-head"><span class="vinzer-dot">' + ICON_TAG +
            '</span><h3>Cargando…</h3></div><div class="vinzer-grid">' + skels + '</div></div>';
    }

    function setupTracking(section, cfg) {
        var input = section.querySelector(".vinzer-code");
        var button = section.querySelector(".vinzer-btn");
        var result = section.querySelector(".vinzer-result");
        if (!input || !button) return;

        function search() {
            var code = (input.value || "").trim();
            if (!code) { result.innerHTML = '<div class="vinzer-msg">Ingresa tu código de seguimiento.</div>'; return; }
            button.disabled = true;
            result.innerHTML = '<div class="vinzer-msg">Buscando…</div>';
            fetch(cfg.api + "/api/public/widget/tracking/" + encodeURIComponent(code) + "?api_key=" + encodeURIComponent(cfg.key))
                .then(function (r) { if (!r.ok) throw new Error("nf"); return r.json(); })
                .then(function (d) {
                    var iconOrImg = d.imagen
                        ? '<img src="' + esc(d.imagen) + '" alt="' + esc(d.mascota || "Mascota") + '">'
                        : ICON_CHECK;
                    var petTitle = d.mascota ? esc(d.mascota) + ' · ' : '';
                    var prog = typeof d.progreso === "number" ? Math.max(5, Math.min(100, d.progreso)) : 0;
                    var progHtml = prog > 0
                        ? '<div class="vinzer-prog"><div class="vinzer-prog-bar" style="width:' + prog + '%"></div></div>'
                        : '';
                    var linkHtml = d.tracking_url
                        ? '<a class="vinzer-track-link" href="' + esc(d.tracking_url) + '" target="_blank" rel="noopener noreferrer">Ver seguimiento en vivo →</a>'
                        : '';
                    result.innerHTML =
                        '<div class="vinzer-status">' +
                        '<div class="vinzer-status-main"><span class="vinzer-ic">' + iconOrImg + '</span>' +
                        '<div><div class="vinzer-st-label">' + petTitle + 'Estado del servicio</div>' +
                        '<div class="vinzer-st-val">' + esc(d.status || "En proceso") + '</div>' +
                        (d.etapa ? '<div class="vinzer-st-stage">Etapa actual: ' + esc(d.etapa) + '</div>' : '') +
                        progHtml +
                        '</div></div>' +
                        linkHtml +
                        '</div>';
                })
                .catch(function () {
                    result.innerHTML = '<div class="vinzer-msg err">No encontramos un seguimiento con ese código. Revísalo e inténtalo de nuevo.</div>';
                })
                .finally(function () { button.disabled = false; });
        }
        button.addEventListener("click", search);
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") search(); });
    }

    function brandFooter() {
        return '<div class="vinzer-brand">' + ICON_PAW + ' CON TECNOLOGÍA DE <a href="https://vinzer.cl/?utm_source=widget" target="_blank" rel="noopener noreferrer">Vinzer.</a></div>';
    }

    function initCatalogContainer(container, cfg) {
        container.className = "vinzer-w";
        container.innerHTML =
            '<div class="vinzer-products-section">' + skeleton(3) + '</div>' +
            '<div class="vinzer-track-wrap"><div class="vinzer-track vinzer-tracking-section">' +
            '<span class="vinzer-eyebrow">' + ICON_PAW + ' Seguimiento en tiempo real</span>' +
            '<h4>Sigue el proceso de tu mascota</h4>' +
            '<p>Ingresa el código que te entregó el crematorio para consultar la etapa actual y abrir el portal ceremonial en vivo.</p>' +
            '<div class="vinzer-row"><div class="vinzer-field">' + ICON_SEARCH +
            '<input class="vinzer-code" type="text" inputmode="text" placeholder="Ej: HNIHLZULB3" autocomplete="off"></div>' +
            '<button class="vinzer-btn" type="button">' + ICON_SEARCH + ' Buscar</button></div>' +
            '<div class="vinzer-result"></div>' +
            '</div></div>' +
            brandFooter();

        var productsSection = container.querySelector(".vinzer-products-section");
        var trackingSection = container.querySelector(".vinzer-tracking-section");

        if (!cfg.key) {
            productsSection.innerHTML = '<div class="vinzer-error-box">Falta configurar la API key del widget.</div>';
            return;
        }

        fetch(cfg.api + "/api/public/widget/products-services?api_key=" + encodeURIComponent(cfg.key))
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
            .then(function (data) { renderCatalog(productsSection, data); })
            .catch(function (err) {
                productsSection.innerHTML = '<div class="vinzer-error-box">No se pudieron cargar los servicios en este momento.</div>';
                if (window.console) console.error("[Vinzer Widget]", err);
            });

        setupTracking(trackingSection, cfg);
    }

    function initPetsContainer(container, cfg) {
        container.className = "vinzer-w";
        container.innerHTML =
            '<div class="vinzer-pets-section">' + skeleton(4) + '</div>' +
            brandFooter();

        var petsSection = container.querySelector(".vinzer-pets-section");
        if (!cfg.key) {
            petsSection.innerHTML = '<div class="vinzer-error-box">Falta configurar la API key del widget.</div>';
            return;
        }

        var limit = parseInt(container.getAttribute("data-vinzer-limit") || "8", 10);
        if (isNaN(limit) || limit < 1) limit = 8;
        if (limit > 24) limit = 24;

        fetch(cfg.api + "/api/public/widget/recent-pets?limit=" + limit + "&api_key=" + encodeURIComponent(cfg.key))
            .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
            .then(function (data) { renderRecentPets(petsSection, data); })
            .catch(function (err) {
                petsSection.innerHTML = '<div class="vinzer-error-box">No se pudieron cargar las últimas mascotas en este momento.</div>';
                if (window.console) console.error("[Vinzer Pets Widget]", err);
            });
    }

    function init() {
        injectStyles();
        var selectors = [
            "#vinzer-widget-root",
            "#vinzer-pets-widget",
            "[data-vinzer-key]"
        ];
        var nodes = document.querySelectorAll(selectors.join(","));
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (el.getAttribute("data-vinzer-mounted") === "1") continue;
            el.setAttribute("data-vinzer-mounted", "1");

            var cfg = {
                key: el.getAttribute("data-vinzer-key") || "",
                api: (el.getAttribute("data-vinzer-api") || "").replace(/\/$/, "")
            };
            var section = (el.getAttribute("data-vinzer-section") || "").toLowerCase();
            if (section === "pets" || section === "memorials" || el.id === "vinzer-pets-widget") {
                initPetsContainer(el, cfg);
            } else {
                initCatalogContainer(el, cfg);
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
