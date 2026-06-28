import json
from datetime import datetime

def generate_certificate_json(
    certificate_type: str,
    theme: str,
    tenant_id: int,
    logo_url: str,
    cert_number: str,
    pet_name: str,
    pet_desc: str,
    owner_name: str,
    owner_contact: str,
    process_details: str,
    auth_declaration: str,
    signature_text: str,
    memorial_message: str = "",
    memorial_title: str = "In Memoriam",
    background_logo_url: str = None,
    background_logo_x: str = "50%",
    background_logo_y: str = "50%",
    background_logo_opacity: float = 0.05,
    background_logo_rotation: float = -15.0,
    background_logo_shape: str = "square",
    header_logo_url: str = None,
    header_logo_x: str = "center",
    header_logo_y: str = "0",
    header_logo_shape: str = "square",
    farewell_text: str = None,
    sections_order: list = None,
    advantages_list: list = None,
    paper_format: str = "Carta",
    title: str = None,
    subtitle: str = None,
    sections_config: dict = None,
    issue_date_str: str = None,
    base_url: str = "http://localhost:8000",
    **kwargs
) -> dict:
    # --- Default Sections Config ---
    default_sections = {
        "header": {"show": True, "label": title or f"Certificado de {certificate_type}"},
        "subtitle": {"show": True, "label": subtitle or "Documento Oficial de Conmemoración"},
        "memorial_title": {"show": True, "label": memorial_title},
        "family_info": {"show": True, "label": "Familia:"},
        "owner_email": {"show": True},
        "owner_phone": {"show": True},
        "pet_type": {"show": True},
        "pet_breed": {"show": True},
        "declaration": {"show": True},
        "service_info": {"show": True, "label": "Información del Servicio"},
        "farewell": {"show": True},
        "memorial_message": {"show": True},
        "tenant_info": {"show": True, "label": "Empresa:"},
        "plan_info": {"show": True, "label": "Plan:"},
        "amount_info": {"show": True, "label": "Monto Pagado:"},
        "date_info": {"show": True, "label": "Fecha de Pago:"},
        "period_info": {"show": True, "label": "Período Cubierto:"},
        "signature": {"show": True, "label": "Soporte SaaS"}
    }
    
    # Merge with provided config
    sc = {**default_sections}
    if sections_config:
        for key, val in sections_config.items():
            if key in sc:
                sc[key].update(val)
            else:
                sc[key] = val

    def fix_url(url):
        if not url: return url
        if url.startswith("/static"):
            return f"{base_url.rstrip('/')}{url}"
        return url

    def format_date_spanish(dt: datetime = None):
        if not dt: dt = datetime.now()
        meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]
        return f"{dt.day} de {meses[dt.month-1]}, {dt.year}"

    if not issue_date_str:
        issue_date_str = format_date_spanish()

    logo_url = fix_url(logo_url)
    background_logo_url = fix_url(background_logo_url)
    header_logo_url = fix_url(header_logo_url)
    # --- Paper Formats ---
    # Standard Letter: 216 x 279 mm
    # Standard Legal: 216 x 356 mm (using 330mm as common compact legal)
    formats = {
        "Carta": {"width": "216mm", "height": "279mm", "margin": "12mm"},
        "Oficio": {"width": "216mm", "height": "330mm", "margin": "12mm"}
    }
    fmt = formats.get(paper_format, formats["Carta"])

    # --- Theme Configurations ---
    themes = {
        "Clásico": {
            "bg_color": "#ffffff",
            "primary_color": "#1a1a1a",
            "accent_color": "#c5a059", # Dorado
            "border_style": "12px double #c5a059",
            "font_main": "'Cinzel', serif",
            "font_title": "'Cinzel', serif",
            "google_fonts": "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');"
        },
        "Moderno": {
            "bg_color": "#f8f9fa",
            "primary_color": "#2d3436",
            "accent_color": "#10b981", # Esmeralda
            "border_style": "4px solid #10b981",
            "font_main": "'Montserrat', sans-serif",
            "font_title": "'Montserrat', sans-serif",
            "google_fonts": "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700&display=swap');"
        },
        "Ecológico": {
            "bg_color": "#f9fbf9",
            "primary_color": "#2c3e50",
            "accent_color": "#27ae60", # Verde
            "border_style": "8px solid #2ecc71",
            "font_main": "'Playfair Display', serif",
            "font_title": "'Playfair Display', serif",
            "google_fonts": "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');"
        },
        "Premium": {
            "bg_color": "#0f172a", # Navy oscuro
            "primary_color": "#f1f5f9",
            "accent_color": "#fbbf24", # Ámbar/Oro
            "border_style": "10px double #fbbf24",
            "font_main": "'Cinzel', serif",
            "font_title": "'Cinzel', serif",
            "google_fonts": "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');"
        }
    }
    
    cfg = themes.get(theme, themes["Clásico"])
    
    # Update styles with premium touches
    styles = f"""
        {cfg.get('google_fonts', '')}
        
        @page {{
            size: {fmt['width']} {fmt['height']};
            margin: 0;
        }}
        .cert-outer-wrapper {{
            background-color: #f1f5f9;
            padding: 0;
            display: flex;
            justify-content: center;
            min-height: 100vh;
        }}
        .cert-body {{
            width: {fmt['width']};
            height: {fmt['height']};
            background-color: {cfg['bg_color']};
            position: relative;
            box-sizing: border-box;
            color: {cfg['primary_color']};
            font-family: {cfg['font_main']};
            line-height: 1.6;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            overflow: hidden;
        }}
        .cert-inner-frame {{
            position: absolute;
            top: {fmt['margin']};
            left: {fmt['margin']};
            right: {fmt['margin']};
            bottom: {fmt['margin']};
            border: {cfg['border_style']};
            padding: 1.5cm 2cm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            z-index: 10;
        }}
        .cert-header img {{
            height: 80px;
            max-width: 280px;
            margin-bottom: 20px;
            object-fit: contain;
            { 'border-radius: 50%; aspect-ratio: 1/1; border: 3px solid ' + cfg['accent_color'] + ';' if header_logo_shape == 'circle' else '' }
        }}
        .cert-header {{
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            position: relative;
        }}
        .cert-logos-row {{
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 30px;
            margin-bottom: 20px;
        }}
        .secondary-logo-placed {{
            position: absolute;
            left: {header_logo_x if header_logo_x != 'center' else '50%'};
            top: {header_logo_y if header_logo_y != '0' else '0'};
            { f'transform: translateX(-50%);' if header_logo_x == 'center' else '' }
            height: 70px;
            max-width: 220px;
            object-fit: contain;
            z-index: 15;
            { 'border-radius: 50%; aspect-ratio: 1/1; border: 2px solid ' + cfg['accent_color'] + ';' if header_logo_shape == 'circle' else '' }
        }}
        .cert-watermark {{
            position: absolute;
            left: {background_logo_x};
            top: {background_logo_y};
            transform: translate(-50%, -50%) rotate({background_logo_rotation}deg);
            width: 85%;
            max-height: 60%;
            opacity: {background_logo_opacity};
            z-index: 1;
            pointer-events: none;
            object-fit: contain;
            { 'border-radius: 50%; aspect-ratio: 1/1;' if background_logo_shape == 'circle' else '' }
        }}
        .cert-title {{
            font-family: {cfg['font_title']};
            font-size: 36px;
            font-weight: 700;
            color: {cfg['accent_color']};
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 4px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }}
        .cert-subtitle {{
            font-size: 12px;
            color: {cfg['primary_color']};
            opacity: 0.6;
            text-transform: uppercase;
            letter-spacing: 5px;
            margin-bottom: 30px;
            font-weight: 400;
        }}
        .cert-meta {{
            font-size: 12px;
            color: {cfg['primary_color']};
            opacity: 0.5;
            margin-bottom: 40px;
            border-bottom: 1px solid {cfg['accent_color']};
            padding-bottom: 12px;
            letter-spacing: 1px;
        }}
        .cert-pet-name {{
            font-size: 52px;
            font-family: {cfg['font_title']};
            font-weight: 700;
            color: {cfg['accent_color']};
            margin: 10px 0;
            letter-spacing: 2px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.05);
        }}
        .cert-pet-desc {{
            font-size: 18px;
            color: {cfg['primary_color']};
            opacity: 0.8;
            margin-bottom: 25px;
            font-weight: 400;
        }}
        .cert-declaration {{
            font-size: 18px;
            margin: 30px auto;
            max-width: 90%;
            font-style: italic;
            color: {cfg['primary_color']};
            line-height: 1.8;
            border-top: 1px solid {cfg['accent_color']}33;
            border-bottom: 1px solid {cfg['accent_color']}33;
            padding: 25px 0;
            position: relative;
        }}
        .cert-declaration::before, .cert-declaration::after {{
            content: '"';
            font-size: 60px;
            color: {cfg['accent_color']};
            opacity: 0.3;
            position: absolute;
            font-family: serif;
        }}
        .cert-declaration::before {{ top: -10px; left: 0; }}
        .cert-declaration::after {{ bottom: -40px; right: 0; }}
        
        .cert-process-box {{
            background-color: {cfg['accent_color']}08;
            border: 1px solid {cfg['accent_color']}22;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 14px;
            text-align: center;
            display: inline-block;
            margin: 20px auto;
            max-width: 85%;
            color: {cfg['primary_color']};
            opacity: 0.9;
        }}
        .cert-process-title {{
            font-weight: 700;
            color: {cfg['accent_color']};
            margin-bottom: 5px;
            display: block;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }}
        .cert-memorial {{
            font-family: {cfg['font_title']};
            font-size: 22px;
            color: {cfg['accent_color']};
            margin: 25px 0;
            font-style: italic;
            font-weight: 400;
        }}
        .cert-footer {{
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
            margin-top: 40px;
        }}
        .cert-signature-block {{
            width: 250px;
        }}
        .cert-signature-line {{
            border-top: 2px solid {cfg['accent_color']};
            margin-bottom: 10px;
        }}
        .cert-signature-name {{
            font-weight: 700;
            font-size: 14px;
            color: {cfg['primary_color']};
            letter-spacing: 1px;
        }}
        .cert-seal {{
            width: 110px;
            height: 110px;
            border: 3px double {cfg['accent_color']};
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: {cfg['accent_color']};
            font-weight: 700;
            font-size: 11px;
            transform: rotate(-15deg);
            opacity: 0.8;
            line-height: 1.3;
            background: {cfg['accent_color']}05;
            box-shadow: 0 0 15px {cfg['accent_color']}22;
        }}
        @media print {{
            body {{ background-color: #fff; margin: 0; }}
            .cert-outer-wrapper {{ padding: 0; background: none; }}
            .cert-body {{ box-shadow: none; border: 1px solid #eee; }}
        }}
        /* Receipts Advantages List */
        .advantage-grid {{
            display: table;
            width: 100%;
            margin-top: 15px;
        }}
        .advantage-row {{
            display: table-row;
        }}
        .advantage-cell {{
            display: table-cell;
            width: 50%;
            padding: 5px;
            vertical-align: middle;
            text-align: left;
            font-size: 12px;
            font-style: normal;
        }}
        .check-icon {{
            color: {cfg['accent_color']};
            font-weight: bold;
            margin-right: 5px;
        }}
    """


    # --- HTML Building ---
    bg_img_html = f'<img src="{background_logo_url}" class="cert-watermark">' if background_logo_url and sc.get('background', {}).get('show', True) else ''
    
    header_logo_html = f'<img src="{logo_url}" alt="Tenant Logo" onerror="this.style.display=\'none\'">'
    
    secondary_logo_html = ""
    if header_logo_url:
        is_placed = header_logo_x != "center" or header_logo_y != "0"
        logo_class = "secondary-logo-placed" if is_placed else ""
        logo_style = "position:relative; height: 60px; max-width: 250px; object-fit: contain;" if not is_placed else ""
        secondary_logo_html = f'<img src="{header_logo_url}" class="{logo_class}" alt="Secondary Logo" style="{logo_style}">'

    # Build Advantages List HTML
    advantages_html = ""
    if isinstance(advantages_list, dict):
        try:
            sorted_keys = sorted(advantages_list.keys(), key=lambda x: int(x))
            advantages_list = [advantages_list[k] for k in sorted_keys]
        except ValueError:
            advantages_list = list(advantages_list.values())
            
    if advantages_list and len(advantages_list) > 0:
        rows = ""
        # Create pairs for grid layout
        for i in range(0, len(advantages_list), 2):
            item1 = advantages_list[i]
            item2 = advantages_list[i+1] if i+1 < len(advantages_list) else ""
            rows += f"""
                <div class="advantage-row">
                    <div class="advantage-cell"><span class="check-icon">✓</span> {item1}</div>
                    {'<div class="advantage-cell"><span class="check-icon">✓</span> ' + item2 + '</div>' if item2 else '<div class="advantage-cell"></div>'}
                </div>
            """
        advantages_html = f"""
            <div style="background-color: {cfg['bg_color']}; border: 1px solid {cfg['accent_color']}33; border-radius: 12px; padding: 15px; margin: 15px 0;">
                <h4 style="color: {cfg['accent_color']}; margin: 0 0 10px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">{sc.get('farewell', {}).get('label', 'Ventajas de tu Plan')}</h4>
                <div class="advantage-grid">
                    {rows}
                </div>
            </div>
        """

    # Define section blocks
    blocks = {
        "header": f"""
            <div class="cert-header">
                <div class="cert-logos-row">
                    {header_logo_html}
                    {secondary_logo_html}
                </div>
                <h1 class="cert-title">{sc['header']['label']}</h1>
                <p class="cert-subtitle">{sc['subtitle']['label']}</p>
                {
                    f'''<div style="margin-top: 15px; font-size: 10px; color: #666; font-weight: 500; text-transform: none; letter-spacing: 0;">
                        {"".join([f"<p style='margin: 2px 0;'>{line}</p>" for line in sc.get("issuer_details", {}).get("label", "").split("\\n")])}
                    </div>''' if "issuer_details" in sc and sc["issuer_details"].get("show", True) and sc["issuer_details"].get("label") else ""
                }
            </div>
        """ if sc['header']['show'] else '',
        
        "meta": f"""
            <div class="cert-meta">
                {sc.get('meta', {}).get('label', 'REGISTRO')}: <strong>{cert_number}</strong> &nbsp; | &nbsp; 
                EMISIÓN: <strong>{issue_date_str}</strong>
            </div>
        """ if sc.get('meta', {}).get('show', True) else '',
        
        "pet_info": f"""
            <div class="cert-pet-section">
                {f'<p style="font-size: 15px; color: #444; margin: 0;">{sc["memorial_title"]["label"]}</p>' if "memorial_title" in sc and sc["memorial_title"]["show"] else ''}
                <h2 class="cert-pet-name">{pet_name}</h2>
                <p class="cert-pet-desc">
                    {pet_desc if not ("," in pet_desc and ("pet_type" in sc or "pet_breed" in sc)) else 
                        ", ".join(filter(None, [
                            pet_desc.split(",")[0].strip() if sc.get("pet_type", {}).get("show", True) else None,
                            pet_desc.split(",")[1].strip() if len(pet_desc.split(",")) > 1 and sc.get("pet_breed", {}).get("show", True) else None
                        ]))
                    }
                </p>
            </div>
        """ if sc.get('pet_info', {}).get('show', True) else '',
        
        "family_info": f"""
            <div style="margin: 10px 0;">
                <span style="color: #666; font-size: 12px;">{sc["family_info"]["label"]}</span><br>
                <span style="font-weight: bold; font-size: 18px;">{owner_name}</span><br>
                <span style="font-size: 11px; color: #888;">
                    {
                        " ".join(filter(None, [
                            next((p for p in owner_contact.split(" ") if "@" in p), None) if sc.get("owner_email", {}).get("show", True) else None,
                            next((p for p in owner_contact.split(" ") if any(c.isdigit() for c in p) and "@" not in p), None) if sc.get("owner_phone", {}).get("show", True) else None
                        ])) if owner_contact else ""
                    }
                </span>
            </div>
        """ if "family_info" in sc and sc["family_info"]["show"] else "",
        
        "declaration": f"""
            <div class="cert-declaration">
                "{auth_declaration}"
            </div>
        """ if "declaration" in sc and sc["declaration"]["show"] else '',
        
        "farewell": advantages_html if advantages_list and len(advantages_list) > 0 and sc.get('farewell', {}).get('show', True) else 
            (f"""
                <div class="cert-farewell" style="font-size: 16px; margin: 15px 0; font-style: italic; color: #444;">
                    {farewell_text}
                </div>
            """ if farewell_text and sc.get('farewell', {}).get('show', True) else ''),
        
        "service_info": f"""
            <div class="cert-process-box">
                <span class="cert-process-title">{sc["service_info"]["label"]}</span>
                <div>{process_details}</div>
            </div>
        """ if "service_info" in sc and sc["service_info"]["show"] else '',
        
        "memorial_message": f"""
            <div class="cert-memorial">"{memorial_message}"</div>
        """ if memorial_message and sc.get("memorial_message", {}).get("show", True) else '',

        "tenant_info": f"""
            <div style="margin: 10px 0;">
                <span style="color: #666; font-size: 12px;">{sc["tenant_info"]["label"]}</span><br>
                <span style="font-weight: bold; font-size: 24px; color: {cfg['accent_color']};">{kwargs.get('tenant_name', 'Empresa de Prueba')}</span>
            </div>
        """ if sc.get("tenant_info", {}).get("show", False) else "",

        "plan_info": f"""
            <div style="margin: 10px 0;">
                <span style="color: #666; font-size: 12px;">{sc["plan_info"]["label"]}</span><br>
                <span style="font-weight: bold; font-size: 18px;">{kwargs.get('plan_name', 'Plan de Prueba')}</span>
            </div>
        """ if sc.get("plan_info", {}).get("show", False) else "",

        "amount_info": f"""
            <div style="margin: 10px 0;">
                <span style="color: #666; font-size: 12px;">{sc["amount_info"]["label"]}</span><br>
                <span style="font-weight: 800; font-size: 20px; color: {cfg['accent_color']};">{kwargs.get('amount', '$0')}</span>
            </div>
        """ if sc.get("amount_info", {}).get("show", False) else "",

        "date_info": f"""
            <div style="margin: 10px 0;">
                <span style="color: #666; font-size: 12px;">{sc["date_info"]["label"]}</span><br>
                <span style="font-weight: bold; font-size: 16px;">{kwargs.get('payment_date', '01/01/2026')}</span>
            </div>
        """ if sc.get("date_info", {}).get("show", False) else "",

        "period_info": f"""
            <div style="margin: 10px 0;">
                <span style="color: #666; font-size: 12px;">{sc["period_info"]["label"]}</span><br>
                <span style="font-weight: bold; font-size: 14px; color: #666;">{kwargs.get('period', 'N/A')}</span>
            </div>
        """ if sc.get("period_info", {}).get("show", False) else "",
        
        "signature": f"""
            <div style="margin-top: 30px;">
                <div style="border-top: 2px solid {cfg['accent_color']}; width: 220px; margin: 0 auto 10px;"></div>
                <div style="font-weight: bold; font-size: 14px;">{signature_text or (sc["signature"]["label"] if "signature" in sc else "")}</div>
                <div style="font-size: 10px; color: #999; text-transform: uppercase;">Administración SaaS</div>
            </div>
        """ if sc.get("signature", {}).get("show", False) else ""
    }

    # Default order if none provided
    default_order = ["header", "meta", "pet_info", "family_info", "declaration", "farewell", "service_info", "memorial_message", "tenant_info", "plan_info", "amount_info", "date_info", "period_info", "signature"]
    order = sections_order or default_order
    
    # Filter blocks in order
    ordered_html = "\n".join([blocks[key] for key in order if key in blocks])

    inner_html = f"""
    <div class="cert-body">
        {bg_img_html}
        <div class="cert-inner-frame">
            <div class="cert-content-wrapper" style="display: flex; flex-direction: column; flex: 1;">
                {ordered_html}
            </div>

            {f"""
            <div class="cert-footer">
                <div class="cert-signature-block">
                    <div class="cert-signature-line"></div>
                    <div class="cert-signature-name">{signature_text}</div>
                    <div style="font-size: 10px; color: #999; text-transform: uppercase;">Firma y Sello Digital</div>
                </div>
                
                <div class="cert-seal">
                    <span>CERTIFICADO</span>
                    <span>AUTÉNTICO</span>
                </div>
            </div>
            """ if "Recibo" not in certificate_type and "receipt" not in certificate_type.lower() else ""}
        </div>
    </div>
    """
    full_html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>{styles}</style>
    </head>
    <body>
        <div class="cert-outer-wrapper">
            {inner_html}
        </div>
    </body>
    </html>
    """

    return {
        "metadata": {
            "tenant_id": str(tenant_id),
            "tipo_certificado": certificate_type,
            "numero_certificado": cert_number,
            "fecha_emision": datetime.now().isoformat(),
            "pdf_url": "",
            "paper_format": paper_format
        },
        "html_content": full_html
    }

def generate_receipt_html(
    tenant_name: str,
    tenant_rut: str,
    tenant_logo: str,
    client_name: str,
    client_rut: str,
    client_phone: str,
    client_address: str,
    pet_name: str,
    pet_species: str,
    pet_breed: str,
    pet_weight: float,
    service_name: str,
    service_price: float,
    additional_services: list, # List of {name, price}
    products: list, # List of {name, quantity, unit_price}
    discount_percent: float,
    total_price: float,
    scheduled_at: datetime,
    issue_date: datetime = None,
    receipt_number: str = "REC-001",
    base_url: str = "http://localhost:8000"
) -> str:
    if not issue_date:
        issue_date = datetime.now()

    def format_currency(value):
        return f"${int(value):,}".replace(",", ".")

    def format_date(dt):
        if not dt: return "N/A"
        return dt.strftime("%d/%m/%Y %H:%M")

    # Clean URL
    if tenant_logo and tenant_logo.startswith("/static"):
        tenant_logo = f"{base_url.rstrip('/')}{tenant_logo}"

    # Calculate subtotal from items to ensure consistency
    items_html = ""
    # Main Service
    items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{service_name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">1</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{format_currency(service_price)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{format_currency(service_price)}</td>
        </tr>
    """
    
    # Additional Services
    for s in additional_services:
        items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{s['name']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">1</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{format_currency(s['price'])}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{format_currency(s['price'])}</td>
            </tr>
        """
        
    # Products
    for p in products:
        subtotal = p['quantity'] * p['unit_price']
        items_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{p['name']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{p['quantity']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{format_currency(p['unit_price'])}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{format_currency(subtotal)}</td>
            </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{ size: Carta; margin: 0; }}
            body {{ font-family: 'Helvetica', 'Arial', sans-serif; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9; }}
            .receipt-container {{ background-color: #fff; width: 190mm; margin: 0 auto; padding: 15mm; border: 1px solid #ddd; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
            .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }}
            .company-info {{ display: flex; align-items: center; gap: 20px; }}
            .company-logo {{ height: 60px; max-width: 150px; object-fit: contain; }}
            .company-details h1 {{ margin: 0; font-size: 20px; color: #1a1a1a; }}
            .company-details p {{ margin: 2px 0; font-size: 12px; color: #666; }}
            .receipt-meta {{ text-align: right; }}
            .receipt-meta h2 {{ margin: 0; color: #e67e22; font-size: 24px; }}
            .receipt-meta p {{ margin: 2px 0; font-size: 12px; font-weight: bold; }}
            
            .section {{ margin-bottom: 25px; }}
            .section-title {{ font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; }}
            
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
            .info-box p {{ margin: 4px 0; font-size: 13px; }}
            .info-box strong {{ color: #555; }}
            
            .items-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }}
            .items-table th {{ background-color: #f8f8f8; padding: 10px; text-align: left; border-bottom: 2px solid #eee; }}
            
            .totals-container {{ display: flex; justify-content: flex-end; }}
            .totals-box {{ width: 250px; }}
            .total-row {{ display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f0f0f0; }}
            .total-row.grand-total {{ border-bottom: none; font-size: 18px; font-weight: bold; color: #1a1a1a; padding-top: 15px; margin-top: 5px; border-top: 2px solid #333; }}
            
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px dashed #ddd; text-align: center; color: #999; font-size: 11px; }}
            
            @media print {{
                body {{ background: none; padding: 0; }}
                .receipt-container {{ border: none; box-shadow: none; margin: 0; width: 100%; }}
            }}
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <div class="header">
                <div class="company-info">
                    {f'<img src="{tenant_logo}" class="company-logo">' if tenant_logo else ''}
                    <div class="company-details">
                        <h1>{tenant_name}</h1>
                        <p>RUT: {tenant_rut}</p>
                        <p>Documento de Control de Servicio</p>
                    </div>
                </div>
                <div class="receipt-meta">
                    <h2>RECIBO</h2>
                    <p>Nº {receipt_number}</p>
                    <p>Fecha: {format_date(issue_date)}</p>
                </div>
            </div>

            <div class="info-grid section">
                <div class="info-box">
                    <div class="section-title">Datos del Cliente</div>
                    <p><strong>Nombre:</strong> {client_name}</p>
                    <p><strong>RUT:</strong> {client_rut or 'N/A'}</p>
                    <p><strong>Teléfono:</strong> {client_phone or 'N/A'}</p>
                    <p><strong>Dirección:</strong> {client_address or 'N/A'}</p>
                </div>
                <div class="info-box">
                    <div class="section-title">Datos de la Mascota</div>
                    <p><strong>Nombre:</strong> {pet_name}</p>
                    <p><strong>Especie/Raza:</strong> {pet_species} {f'/ {pet_breed}' if pet_breed else ''}</p>
                    <p><strong>Peso:</strong> {f'{pet_weight} kg' if pet_weight else 'N/A'}</p>
                    <p><strong>Servicio:</strong> {service_name}</p>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Detalle del Servicio</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th style="text-align: right; width: 60px;">Cant.</th>
                            <th style="text-align: right; width: 100px;">Unitario</th>
                            <th style="text-align: right; width: 100px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
            </div>

            <div class="totals-container">
                <div class="totals-box">
                    <div class="total-row">
                        <span>Resumen:</span>
                        <span>{format_currency(total_price / (1 - discount_percent/100) if discount_percent < 100 else total_price)}</span>
                    </div>
                    {f"""
                    <div class="total-row" style="color: #c0392b;">
                        <span>Descuento ({discount_percent}%):</span>
                        <span>-{format_currency((total_price / (1 - discount_percent/100) if discount_percent < 100 else total_price) - total_price)}</span>
                    </div>
                    """ if discount_percent > 0 else ""}
                    <div class="total-row grand-total">
                        <span>TOTAL A PAGAR:</span>
                        <span>{format_currency(total_price)}</span>
                    </div>
                </div>
            </div>

            <div class="section" style="margin-top: 30px;">
                <div class="section-title">Información Adicional</div>
                <p style="font-size: 12px; color: #666;">
                    <strong>Fecha Programada:</strong> {format_date(scheduled_at)}<br>
                    Este documento es un comprobante interno de servicio y no constituye una factura electrónica ante el SII.
                </p>
            </div>

            <div class="footer">
                <p>Gracias por confiar en {tenant_name}</p>
                <p>Powered by SaaSCrematorio.com</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html


# --- Certificado por Imagen (categoría "certificadoImg") ---------------------
# El admin sube una imagen de fondo (16:9 / 4:3 / 3:4) y posiciona campos
# dinámicos encima. Render = imagen de fondo + capas absolutas en %.
# Reutiliza el mismo formato de retorno que generate_certificate_json.

_IMG_ASPECT_PADDING = {
    "16:9": 56.25,    # 9 / 16 * 100
    "4:3": 75.0,      # 3 / 4 * 100
    "3:4": 133.333,   # 4 / 3 * 100
}

_IMG_MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]

# Marco decorativo de la foto de la mascota. Paleta FIJA (debe coincidir con el
# frontend: lib/certFrame.ts). Solo estos colores.
_FRAME_COLORS = {
    "gold": {"solid": "#c9a227", "from": "#f3d27a", "to": "#a8791f", "glow": "rgba(201,162,39,0.65)"},
    "black": {"solid": "#1a1a1a", "from": "#4a4a4a", "to": "#000000", "glow": "rgba(0,0,0,0.6)"},
    "white": {"solid": "#ffffff", "from": "#ffffff", "to": "#cfcfcf", "glow": "rgba(255,255,255,0.75)"},
    "blue": {"solid": "#2563eb", "from": "#60a5fa", "to": "#1e3a8a", "glow": "rgba(37,99,235,0.6)"},
    "celeste": {"solid": "#38bdf8", "from": "#7dd3fc", "to": "#0284c7", "glow": "rgba(56,189,248,0.6)"},
}
_FRAME_BORDER_PCT = 5      # grosor del borde = 5% del lado de la foto
_FRAME_GLOW_RATIO = 0.18   # blur del halo relativo (se aproxima en px)
_FEATHER_INNER_STOP = 72   # % del radio nítido antes de desvanecer (feather)


def _img_parse_date(value):
    """Acepta datetime, date o string ISO; devuelve datetime o None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        from datetime import date as _date
        if isinstance(value, _date):
            return datetime(value.year, value.month, value.day)
    except Exception:
        pass
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _img_format_date(dt, fmt):
    """Formatea una fecha según el modo elegido (default/override)."""
    if not dt:
        return ""
    fmt = (fmt or "short").lower()
    if fmt == "long":
        return f"{dt.day} de {_IMG_MESES[dt.month - 1]} de {dt.year}"
    if fmt == "year":
        return str(dt.year)
    if fmt == "month_year":
        return f"{_IMG_MESES[dt.month - 1]} de {dt.year}"
    # short por defecto
    return dt.strftime("%d/%m/%Y")


def generate_image_certificate_html(
    background_url: str,
    aspect_ratio: str,
    fields: list,
    pet_name: str = "",
    birth_date=None,
    death_date=None,
    current_date=None,
    pet_images: list = None,
    tenant_logo_url: str = None,
    tenant_rut: str = "",
    tenant_manager: str = "",
    tenant_manager_rut: str = "",
    tenant_phone: str = "",
    tenant_address: str = "",
    elements: list = None,
    overrides: dict = None,
    certificate_type: str = "Certificado",
    cert_number: str = "",
    tenant_id: int = 0,
    paper_format: str = "Carta",
    base_url: str = "http://localhost:8000",
    **kwargs,
) -> dict:
    """Genera el HTML de un certificado basado en imagen con campos posicionados.

    - background_url: URL de la imagen de fondo (global, categoría ImgCertificado).
    - aspect_ratio: "16:9" | "4:3" | "3:4".
    - fields: lista de dicts con {id, type, x, y, fontSize, fontFamily, color,
      align, bold, format, slot, w, shape}. x/y/w en % relativos al lienzo.
    - overrides: dict opcional {field_id: {format, image_url}} elegido por el
      tenant al emitir (no mueve posiciones, solo ajusta valores).
    """
    fields = fields or []
    elements = elements or []
    overrides = overrides or {}
    pet_images = pet_images or []

    # z-index: el fondo SIEMPRE es la capa base (0). Los campos de texto/imagen
    # se dibujan en un nivel por defecto (FIELD_Z); los elementos decorativos
    # llevan su propio z (>=1) y pueden quedar por debajo o por encima del texto,
    # pero nunca por debajo del fondo.
    FIELD_Z = 50
    current_date = _img_parse_date(current_date) or datetime.now()
    birth_date = _img_parse_date(birth_date)
    death_date = _img_parse_date(death_date)

    def fix_url(url):
        if not url:
            return url
        if url.startswith("/static") or url.startswith("/storage"):
            return f"{base_url.rstrip('/')}{url}"
        return url

    padding_bottom = _IMG_ASPECT_PADDING.get(aspect_ratio, _IMG_ASPECT_PADDING["16:9"])
    bg_url = fix_url(background_url)

    def esc(text):
        return (
            str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
        )

    # layers: lista de tuplas (z, html) que luego se ordenan por z.
    layers = []
    # spec_items: representación estructurada (resuelta) para redibujar el
    # certificado en canvas con todos los efectos (lo usa el repositorio para el PDF,
    # ya que html2canvas no soporta mask-image/box-shadow).
    spec_items = []

    # 1. Elementos decorativos (debajo o encima del texto según su z; nunca < fondo)
    for el in elements:
        if not isinstance(el, dict):
            continue
        el_id = el.get("id")
        # Visibilidad (toggle del tenant). El override 'enabled' aplica a
        # cualquier elemento; si no viene, los opcionales usan su default_on.
        ov_el = overrides.get(el_id, {}) if el_id else {}
        if "enabled" in ov_el:
            if not ov_el.get("enabled"):
                continue
        elif el.get("optional") and not el.get("default_on", True):
            continue
        url = fix_url(el.get("url"))
        if not url:
            continue
        ex = el.get("x", 50)
        ey = el.get("y", 50)
        ew = el.get("w", 20)
        ez = max(1, int(el.get("z", 10) or 10))  # nunca por debajo del fondo (0)
        rot = el.get("rotation", 0) or 0
        transform = f"translate(-50%,-50%) rotate({rot}deg)" if rot else "translate(-50%,-50%)"
        layers.append((ez,
            f'<img src="{esc(url)}" '
            f'style="position:absolute; left:{ex}%; top:{ey}%; transform:{transform}; '
            f'width:{ew}%; object-fit:contain; z-index:{ez};" />'
        ))
        spec_items.append({
            "kind": "image", "url": url, "x": ex, "y": ey, "w": ew, "z": ez,
            "aspect": True, "rotation": rot, "objectFit": "contain",
        })

    # 2. Campos (texto / imágenes de mascota / logo). Nivel por defecto FIELD_Z.
    for field in fields:
        if not isinstance(field, dict):
            continue
        ftype = field.get("type")
        fid = field.get("id")
        ov = overrides.get(fid, {}) if fid else {}

        # Visibilidad del campo (toggle del tenant). Si el override marca el
        # campo como deshabilitado, no se dibuja.
        if "enabled" in ov and not ov.get("enabled"):
            continue

        x = field.get("x", 50)
        y = field.get("y", 50)
        base_pos = (
            f"position:absolute; left:{x}%; top:{y}%; "
            f"transform:translate(-50%,-50%); z-index:{FIELD_Z};"
        )

        if ftype in ("imagen_mascota", "logo_tenant"):
            if ftype == "logo_tenant":
                img_src = ov.get("image_url") or tenant_logo_url
            else:
                slot = field.get("slot", 0)
                img_src = ov.get("image_url")
                if not img_src and 0 <= slot < len(pet_images):
                    img_src = pet_images[slot]
            if not img_src:
                continue
            img_src = fix_url(img_src)
            w = field.get("w", 15)
            radius = "50%" if field.get("shape") == "circle" else "8px"
            # Logo: contain para no recortarlo; foto de mascota: cover.
            object_fit = "contain" if ftype == "logo_tenant" else "cover"

            # Marco decorativo (solo foto de mascota): borde / halo / feather.
            frame = ov.get("frame") if isinstance(ov.get("frame"), dict) else field.get("frame")
            is_circle = field.get("shape") == "circle"
            if not isinstance(frame, dict) or ftype != "imagen_mascota":
                frame = {}

            # Feather: desvanecimiento radial del borde exterior (solo círculo).
            feather_css = ""
            if frame.get("feather") and is_circle:
                _grad = f"radial-gradient(circle closest-side at center, #000 {_FEATHER_INNER_STOP}%, transparent 100%)"
                feather_css = (f"-webkit-mask-image:{_grad}; mask-image:{_grad}; "
                               f"-webkit-mask-size:100% 100%; mask-size:100% 100%;")

            spec_items.append({
                "kind": "image", "url": img_src, "x": x, "y": y, "w": w, "z": FIELD_Z,
                "shape": "circle" if is_circle else "rect",
                "objectFit": object_fit,
                "frame": (frame if (ftype == "imagen_mascota" and frame) else None),
            })

            has_wrapper = bool(frame.get("border") or frame.get("glow"))
            if has_wrapper:
                fc = _FRAME_COLORS.get(frame.get("color"), _FRAME_COLORS["gold"])
                inset = _FRAME_BORDER_PCT if frame.get("border") else 0
                if frame.get("border"):
                    paint = (f"linear-gradient(135deg, {fc['from']}, {fc['to']})"
                             if frame.get("gradient") else fc["solid"])
                    bg = f"background:{paint};"
                else:
                    bg = ""
                shadow = f"box-shadow:0 0 22px 4px {fc['glow']};" if frame.get("glow") else ""
                layers.append((FIELD_Z,
                    f'<div style="{base_pos} width:{w}%; aspect-ratio:1/1; '
                    f'border-radius:{radius}; {bg} {shadow}">'
                    f'<img src="{esc(img_src)}" '
                    f'style="position:absolute; inset:{inset}%; width:auto; height:auto; '
                    f'object-fit:cover; border-radius:{radius}; {feather_css}" />'
                    f'</div>'
                ))
                continue

            layers.append((FIELD_Z,
                f'<img src="{esc(img_src)}" class="cert-img" '
                f'style="{base_pos} width:{w}%; aspect-ratio:1/1; '
                f'object-fit:{object_fit}; border-radius:{radius}; {feather_css}" />'
            ))
            continue

        # Campos de texto
        if ftype == "nombre_mascota":
            value = pet_name or ""
        elif ftype == "fecha_nacimiento":
            value = _img_format_date(birth_date, ov.get("format") or field.get("format"))
        elif ftype == "fecha_fallecimiento":
            value = _img_format_date(death_date, ov.get("format") or field.get("format"))
        elif ftype == "fecha_actual":
            value = _img_format_date(current_date, ov.get("format") or field.get("format"))
        elif ftype == "texto_fijo":
            value = field.get("value", "")
        elif ftype == "rut_tenant":
            value = tenant_rut or ""
        elif ftype == "encargado_tenant":
            value = tenant_manager or ""
        elif ftype == "rut_encargado":
            value = tenant_manager_rut or ""
        elif ftype == "celular_tenant":
            value = tenant_phone or ""
        elif ftype == "direccion_tenant":
            value = tenant_address or ""
        else:
            continue

        font_size = field.get("fontSize", 24)
        font_family = field.get("fontFamily", "Georgia, serif")
        color = field.get("color", "#1a1a1a")
        align = field.get("align", "center")
        weight = "700" if field.get("bold") else "400"
        layers.append((FIELD_Z,
            f'<div class="cert-field" style="{base_pos} '
            f'font-size:{font_size}px; font-family:{font_family}; '
            f'color:{color}; text-align:{align}; font-weight:{weight}; '
            f'white-space:nowrap;">{esc(value)}</div>'
        ))
        spec_items.append({
            "kind": "text", "value": value, "x": x, "y": y, "z": FIELD_Z,
            "fontSize": font_size, "fontFamily": font_family, "color": color,
            "align": align, "bold": bool(field.get("bold")),
        })

    # Ordenar por z (estable) y unir; el fondo se renderiza aparte como capa base.
    layers.sort(key=lambda t: t[0])
    layers_html = "\n".join(html for _z, html in layers)
    google_fonts = (
        "@import url('https://fonts.googleapis.com/css2?"
        "family=Cinzel:wght@400;700&family=Playfair+Display:wght@400;700&"
        "family=Montserrat:wght@300;400;700&family=Great+Vibes&display=swap');"
    )

    # Orientación del papel según el ratio: 3:4 es vertical, 16:9 y 4:3 horizontal.
    orientation = "portrait" if aspect_ratio == "3:4" else "landscape"
    bg_img_html = f'<img class="cert-bg" src="{esc(bg_url)}" alt="" />' if bg_url else ""

    # Spec estructurado embebido: permite redibujar el certificado en canvas con
    # todos los efectos (borde/halo/feather) al generar el PDF en el repositorio.
    import json as _json
    spec = {"v": 1, "aspectRatio": aspect_ratio, "backgroundUrl": bg_url, "items": spec_items}
    spec_json = _json.dumps(spec, ensure_ascii=False).replace("</", "<\\/")
    spec_script = f'<script type="application/json" id="cert-render-spec">{spec_json}</script>'

    full_html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            {google_fonts}
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            @page {{ size: A4 {orientation}; margin: 0; }}
            html, body {{
                width: 100%;
                background: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
            .cert-canvas {{
                position: relative;
                width: 100%;
                height: 0;
                padding-bottom: {padding_bottom}%;
                overflow: hidden;
            }}
            /* Fondo como <img> real: los navegadores SÍ imprimen <img>, no así
               los background-image (que se omiten al imprimir por defecto). */
            .cert-bg {{
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 0;
            }}
            .cert-field {{ line-height: 1.1; }}
        </style>
    </head>
    <body>
        <div class="cert-canvas">
            {bg_img_html}
            {layers_html}
        </div>
        {spec_script}
    </body>
    </html>
    """

    return {
        "metadata": {
            "tenant_id": str(tenant_id),
            "tipo_certificado": certificate_type,
            "numero_certificado": cert_number,
            "fecha_emision": datetime.now().isoformat(),
            "pdf_url": "",
            "paper_format": paper_format,
            "aspect_ratio": aspect_ratio,
        },
        "html_content": full_html,
    }
