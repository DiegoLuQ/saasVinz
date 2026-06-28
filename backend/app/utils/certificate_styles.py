def get_certificate_themes():
    return {
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

def get_certificate_css(cfg, fmt, header_logo_shape, header_logo_x, header_logo_y, background_logo_x, background_logo_y, background_logo_rotation, background_logo_opacity, background_logo_shape):
    return f"""
        {cfg.get('google_fonts', '')}
        
        @page {{
            size: {fmt['width']} {fmt['height']};
            margin: 0;
        }}
        .cert-outer-wrapper {{
            background-color: {cfg['bg_color']};
            width: {fmt['width']};
            height: {fmt['height']};
            margin: 0 auto;
            position: relative;
        }}
        .cert-body {{
            width: 100%;
            height: 100%;
            background-color: {cfg['bg_color']};
            position: relative;
            box-sizing: border-box;
            color: {cfg['primary_color']};
            font-family: {cfg['font_main']};
            line-height: 1.6;
            text-align: center;
            overflow: visible;
        }}
        .cert-inner-frame {{
            position: absolute;
            top: {fmt['margin']};
            left: {fmt['margin']};
            right: {fmt['margin']};
            bottom: {fmt['margin']};
            border: {cfg['border_style']};
            padding: 2cm 2cm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            z-index: 10;
        }}
        .cert-header img {{
            height: 55px;
            max-width: 200px;
            margin-bottom: 5px;
            object-fit: contain;
            { 'border-radius: 50%; aspect-ratio: 1/1; border: 3px solid ' + cfg['accent_color'] + ';' if header_logo_shape == 'circle' else ('border-radius: 8px; aspect-ratio: 1/1;' if header_logo_shape == 'square' else 'border-radius: 4px;') }
        }}
        .cert-header {{
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            position: relative;
        }}
        .cert-logos-row {{
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            margin-bottom: 5px;
        }}
        .secondary-logo-placed {{
            position: absolute;
            left: {header_logo_x if header_logo_x != 'center' else '50%'};
            top: {header_logo_y if header_logo_y != '0' else '0'};
            { f'transform: translateX(-50%);' if header_logo_x == 'center' else '' }
            height: 45px;
            max-width: 150px;
            object-fit: contain;
            z-index: 15;
            { 'border-radius: 50%; aspect-ratio: 1/1; border: 2px solid ' + cfg['accent_color'] + ';' if header_logo_shape == 'circle' else ('border-radius: 8px; aspect-ratio: 1/1;' if header_logo_shape == 'square' else 'border-radius: 4px;') }
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
            { 'border-radius: 50%; aspect-ratio: 1/1;' if background_logo_shape == 'circle' else ('border-radius: 12px; aspect-ratio: 1/1;' if background_logo_shape == 'square' else 'border-radius: 8px;') }
        }}
        .cert-title {{
            font-family: {cfg['font_title']};
            font-size: 24px;
            font-weight: 700;
            color: {cfg['accent_color']};
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }}
        .cert-subtitle {{
            font-size: 10px;
            color: {cfg['primary_color']};
            opacity: 0.6;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 5px;
            font-weight: 400;
        }}
        .cert-meta {{
            font-size: 10px;
            color: {cfg['primary_color']};
            opacity: 0.5;
            margin-bottom: 10px;
            border-bottom: 1px solid {cfg['accent_color']};
            padding-bottom: 5px;
            letter-spacing: 1px;
        }}
        .cert-pet-name {{
            font-size: 36px;
            font-family: {cfg['font_title']};
            font-weight: 700;
            color: {cfg['accent_color']};
            margin: 0;
            letter-spacing: 2px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.05);
        }}
        .cert-pet-desc {{
            font-size: 16px;
            color: {cfg['primary_color']};
            opacity: 0.8;
            margin-bottom: 10px;
            font-weight: 400;
        }}
        .cert-declaration {{
            font-size: 14px;
            margin: 10px auto;
            max-width: 90%;
            font-style: italic;
            color: {cfg['primary_color']};
            line-height: 1.6;
            border-top: 1px solid {cfg['accent_color']}33;
            border-bottom: 1px solid {cfg['accent_color']}33;
            padding: 10px 0;
            position: relative;
        }}
        .cert-declaration::before, .cert-declaration::after {{
            content: '"';
            font-size: 30px;
            color: {cfg['accent_color']};
            opacity: 0.3;
            position: absolute;
            font-family: serif;
        }}
        .cert-declaration::before {{ top: -5px; left: 0; }}
        .cert-declaration::after {{ bottom: -20px; right: 0; }}
        
        .cert-process-box {{
            background-color: {cfg['accent_color']}08;
            border: 1px solid {cfg['accent_color']}22;
            padding: 8px 15px;
            border-radius: 8px;
            font-size: 12px;
            text-align: center;
            display: inline-block;
            margin: 10px auto;
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
