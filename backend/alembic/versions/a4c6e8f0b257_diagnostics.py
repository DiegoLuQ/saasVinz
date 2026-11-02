"""diagnostics

Diagnóstico 360° para crematorios prospecto (SuperAdmin, services/diagnostics.py,
especificación en DIAGNOSTICO_360.md):

- sys_diagnostic_categories: categorías con su peso (suman 100).
- sys_diagnostic_questions: banco de preguntas con alternativas y su %, «No aplica»,
  modalidades (10/15/20), recomendación y función de Vinzer relacionada.
- sys_diagnostics: cada diagnóstico (datos del crematorio, respuestas con copia del
  texto y del %, puntajes, nivel, plan sugerido, estado comercial).
- sys_saas_config.diagnostic_config: niveles y reglas del plan sugerido (NULL = valores por defecto).

Tablas globales del SuperAdmin: sin tenant_id propio, sin RLS.
Siembra las 10 categorías y las 20 preguntas iniciales.

Revision ID: a4c6e8f0b257
Revises: f2a4c6e8b135
Create Date: 2026-11-01 12:00:00.000000

"""
import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a4c6e8f0b257'
down_revision: Union[str, Sequence[str], None] = 'f2a4c6e8b135'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CATEGORIES = [
    ("C1", "Identidad y certificados", 8, "Certificados con diseño propio y tarjetas de homenaje"),
    ("C2", "Instalaciones y traslado", 8, None),
    ("C3", "Gestión y software", 15, "Órdenes, clientes y mascotas en un solo lugar, con roles y respaldo en la nube"),
    ("C4", "Operación y trazabilidad", 15, "Flujo operativo con evidencias y seguimiento en línea para la familia"),
    ("C5", "Normativa y seguridad", 10, None),
    ("C6", "Google y sitio web", 10, "Catálogo de planes público, widget para tu web e invitación a reseñas en Google"),
    ("C7", "WhatsApp y atención", 8, "Formulario público y avisos automáticos a la familia"),
    ("C8", "Redes sociales y contenido", 6, "Diseños para redes con IA a partir de la foto de la mascota"),
    ("C9", "Planes, precios y servicios", 10, "Planes, tramos de peso y catálogo compartible"),
    ("C10", "Alianzas y fidelización", 10, "Veterinarias aliadas con comisiones, encuesta de satisfacción y memoriales"),
]

ALL = [10, 15, 20]
STD = [15, 20]
FULL = [20]


def _o(*items):
    return [{"text": t, "pct": p} for t, p in items]


# (categoría, texto, ayuda, alternativas, permite «No aplica», modalidades, recomendación, función Vinzer)
QUESTIONS = [
    ("C1", "¿Cómo es el certificado de cremación que entregas?",
     "El certificado es lo que la familia guarda y muestra. Refleja tu seriedad y tu marca.",
     _o(("Personalizado con mi logo, colores y datos de la mascota, generado automáticamente", 100),
        ("Con mi logo, pero lo armo a mano cada vez (Word, Canva)", 60),
        ("Genérico, sin mi marca", 25), ("No entrego certificado", 0)),
     False, ALL, "Entrega un certificado con tu identidad y los datos de la mascota, sin armarlo a mano cada vez.",
     "Certificados con diseño propio generados automáticamente"),
    ("C1", "¿Tu marca (logo, colores, tipografía) se ve igual en todo lo que entregas?",
     "Una marca coherente en certificados, redes, web y urnas transmite confianza en un momento sensible.",
     _o(("Sí, tengo logo, colores definidos y se usan igual en todo", 100),
        ("Tengo logo, pero cada pieza se ve distinta", 60),
        ("Tengo logo, sin colores ni estilo definidos", 25), ("No tengo logo profesional", 0)),
     False, FULL, "Define tu logo, colores y tipografía y úsalos igual en certificados, redes y web.", None),
    ("C2", "¿Tienes un espacio para que la familia despida a su mascota?",
     "Un espacio privado y digno para la despedida es uno de los momentos que más recuerdan las familias.",
     _o(("Sala privada acondicionada para la despedida", 100), ("Un espacio adaptado, no exclusivo", 60),
        ("Solo despedida en el domicilio o la veterinaria", 25), ("No ofrezco instancia de despedida", 0)),
     False, ALL, "Habilita un espacio privado y cálido para que la familia se despida.", None),
    ("C2", "¿Cómo realizas el retiro de la mascota?",
     "El traslado es el primer contacto físico con la familia: el vehículo y el trato comunican respeto.",
     _o(("Vehículo exclusivo, identificado y con camilla o contenedor adecuado", 100),
        ("Vehículo exclusivo sin identificar", 60), ("Vehículo particular", 25),
        ("No ofrezco retiro y no tengo alternativa", 0)),
     True, FULL, "Usa un vehículo exclusivo e identificado, con camilla o contenedor adecuado.", None),
    ("C3", "¿Dónde registras las órdenes de cremación?",
     "Un registro ordenado te permite saber en segundos qué servicio tiene cada mascota, cuánto se pagó y en qué etapa va.",
     _o(("En un software de gestión para crematorios", 100), ("En una planilla (Excel / Google Sheets)", 60),
        ("En cuaderno, notas o conversaciones de WhatsApp", 25), ("No llevo un registro formal", 0)),
     False, ALL, "Registra cada orden con su cliente, mascota, servicio y pago en un sistema de gestión.",
     "Órdenes, clientes y mascotas en un solo lugar"),
    ("C3", "¿Dónde guardas las fotos de las mascotas y los documentos?",
     "Si se pierde el computador o el celular, ¿pierdes la historia de tus clientes? Un respaldo en la nube lo evita.",
     _o(("En la nube, con respaldo automático y ordenado por cliente", 100),
        ("En la nube (Drive, Dropbox), subidas a mano", 60), ("En el computador o el celular", 25),
        ("No las guardo", 0)),
     False, STD, "Guarda fotos y documentos en la nube, ordenados por cliente y con respaldo automático.",
     "Fotos y documentos en la nube con respaldo automático"),
    ("C4", "¿La familia puede saber en qué etapa está el servicio?",
     "La incertidumbre genera ansiedad y llamadas. Informar cada etapa da tranquilidad y confianza.",
     _o(("Sí, con un enlace de seguimiento en línea con etapas y fotos", 100),
        ("Le avisamos manualmente por WhatsApp en cada etapa", 60), ("Solo si la familia pregunta", 25),
        ("No informamos hasta la entrega", 0)),
     False, ALL, "Comparte con la familia un enlace donde vea cada etapa del servicio.",
     "Seguimiento en línea para la familia y avisos automáticos"),
    ("C4", "¿Cómo aseguras que cada mascota no se confunda durante el proceso?",
     "La trazabilidad garantiza que la familia recibe las cenizas de su mascota. Es la mayor preocupación del cliente.",
     _o(("Código único por orden y registro de cada etapa con evidencia (foto, firma)", 100),
        ("Placa o etiqueta física que acompaña a la mascota", 60), ("Por el nombre, de memoria", 25),
        ("No tengo un método definido", 0)),
     False, STD, "Asigna un código único a cada orden y registra cada etapa con foto y firma.",
     "Código de verificación y evidencias por etapa"),
    ("C5", "¿Tienes al día las autorizaciones de funcionamiento (sanitaria, municipal, horno)?",
     "Operar con permisos vigentes te protege legalmente y es un argumento de confianza frente a la competencia.",
     _o(("Todas vigentes y archivadas", 100), ("La mayoría, algunas en trámite", 60), ("Solo algunas", 25),
        ("No lo sé / ninguna", 0)),
     False, ALL, "Regulariza y archiva tus autorizaciones; muéstralas como respaldo frente a las familias.", None),
    ("C5", "¿Tienes protocolos escritos (manipulación, limpieza, seguridad del horno, emergencias)?",
     "Los protocolos hacen que el servicio sea igual de bueno sin importar quién lo realice.",
     _o(("Escritos y el equipo está capacitado", 100), ("Escritos, pero no siempre se aplican", 60),
        ("Solo de palabra", 25), ("No existen", 0)),
     False, FULL, "Escribe tus protocolos y capacita al equipo para aplicarlos siempre.", None),
    ("C6", "¿Cómo está tu Perfil de Empresa en Google (ex Google My Business)?",
     "La mayoría de las familias busca «crematorio de mascotas cerca de mí». Un perfil completo y con reseñas te pone primero.",
     _o(("Verificado, completo (fotos, horario, servicios) y respondo las reseñas", 100),
        ("Verificado, pero incompleto o sin reseñas recientes", 60), ("Existe, pero no lo administro", 25),
        ("No tengo", 0)),
     False, ALL, "Completa tu Perfil de Empresa en Google y pide reseñas después de cada servicio.",
     "Encuesta post-servicio que invita a dejar reseña en Google"),
    ("C6", "¿Tienes sitio web propio?",
     "Un sitio con tus planes y precios responde dudas antes de que te escriban y filtra consultas.",
     _o(("Con dominio propio, planes, precios y formulario de solicitud", 100),
        ("Web básica, sin planes ni formulario", 60), ("Solo redes sociales", 25), ("Nada", 0)),
     False, STD, "Publica tus planes, precios y un formulario de solicitud en línea.",
     "Catálogo de planes y formulario público, también incrustables en tu web"),
    ("C7", "¿Qué WhatsApp usas para atender?",
     "WhatsApp Business permite catálogo, horario, respuestas rápidas y mensaje de ausencia: atención profesional las 24 h.",
     _o(("Business configurado (catálogo, horario, respuestas rápidas, ausencia)", 100),
        ("Business sin configurar", 60), ("WhatsApp personal", 25), ("No atiendo por WhatsApp", 0)),
     False, ALL, "Usa WhatsApp Business con catálogo, horario, respuestas rápidas y mensaje de ausencia.", None),
    ("C7", "¿Cuánto tardas en responder una consulta?",
     "Ante una pérdida, la familia contacta a varios crematorios: el primero que responde con claridad suele quedarse con el servicio.",
     _o(("Menos de 15 minutos, también fuera de horario", 100), ("Menos de 1 hora en horario de atención", 60),
        ("El mismo día", 25), ("Al día siguiente o más", 0)),
     False, FULL, "Responde rápido y deja a la familia un formulario para registrar los datos sin esperar.",
     "Formulario público para que la familia registre los datos a cualquier hora"),
    ("C8", "¿Con qué frecuencia publicas en redes (Instagram, Facebook, TikTok)?",
     "Publicar con constancia te mantiene presente cuando una familia o una veterinaria necesita recomendarte.",
     _o(("Semanalmente, con planificación", 100), ("Cada 2 a 4 semanas", 60), ("Muy esporádicamente", 25),
        ("No tengo redes activas", 0)),
     False, ALL, "Publica al menos una vez por semana con un calendario simple.",
     "Diseños para redes listos en minutos"),
    ("C8", "¿Qué tipo de contenido publicas?",
     "Homenajes (con permiso de la familia), contenido educativo y testimonios generan más confianza que solo promociones.",
     _o(("Homenajes, contenido educativo y testimonios con diseño de mi marca", 100),
        ("Principalmente promociones y precios", 60), ("Contenido compartido de otros", 25), ("No publico", 0)),
     False, FULL, "Publica homenajes y testimonios con tu marca, además de promociones.",
     "Diseños para redes con IA a partir de la foto de la mascota"),
    ("C9", "¿Tus planes están definidos por escrito, con lo que incluye cada uno?",
     "Planes claros evitan malentendidos en un momento difícil y ayudan a elegir sin presión.",
     _o(("Sí, publicados en un catálogo online que puedo compartir", 100),
        ("Definidos, pero los explico por chat o teléfono", 60), ("El precio depende de cada caso", 25),
        ("No tengo planes definidos", 0)),
     False, ALL, "Define tus planes por escrito y compártelos con un enlace.",
     "Catálogo de planes compartible con enlace"),
    ("C9", "¿Cómo calculas el precio según el peso de la mascota?",
     "Los tramos de peso publicados hacen el precio transparente y evitan cobros discutidos.",
     _o(("Tramos de peso definidos y visibles para la familia", 100), ("Tramos definidos, pero solo internos", 60),
        ("Precio único para todos los tamaños", 25), ("Caso a caso, sin criterio fijo", 0)),
     False, STD, "Define tramos de peso con su recargo y muéstralos a la familia.",
     "Tramos de peso que calculan el precio solos"),
    ("C10", "¿Trabajas con veterinarias aliadas que te deriven casos?",
     "Las veterinarias son la principal fuente de derivación. Un convenio formal con comisión las motiva a recomendarte.",
     _o(("Sí, con convenio, comisión y registro de cada derivación", 100),
        ("Algunas me derivan, sin convenio formal", 60), ("Contacto informal ocasional", 25), ("Ninguna", 0)),
     False, ALL, "Formaliza convenios con veterinarias y registra cada derivación con su comisión.",
     "Veterinarias aliadas, enlaces de derivación y comisiones"),
    ("C10", "¿Qué haces después de entregar las cenizas?",
     "El acompañamiento posterior genera recomendaciones, reseñas y clientes que vuelven.",
     _o(("Mensaje de seguimiento, encuesta, invitación a reseña y memorial digital", 100),
        ("Solo un mensaje de agradecimiento", 60), ("A veces escribimos", 25), ("Nada", 0)),
     False, STD, "Acompaña a la familia después de la entrega: encuesta, reseña y memorial.",
     "Encuesta de satisfacción, memoriales y tarjetas de homenaje"),
]


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sys_diagnostic_categories (
            id SERIAL PRIMARY KEY,
            key VARCHAR(20) NOT NULL UNIQUE,
            name VARCHAR(80) NOT NULL,
            weight DOUBLE PRECISION NOT NULL DEFAULT 0,
            vinzer_feature TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sys_diagnostic_questions (
            id SERIAL PRIMARY KEY,
            category_id INTEGER NOT NULL REFERENCES sys_diagnostic_categories(id) ON DELETE CASCADE,
            text VARCHAR(300) NOT NULL,
            help TEXT,
            options JSON NOT NULL,              -- [{text, pct}]
            allows_na BOOLEAN NOT NULL DEFAULT FALSE,
            modes JSON NOT NULL,                -- [10, 15, 20]
            recommendation TEXT,
            vinzer_feature TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sys_diagnostics (
            id SERIAL PRIMARY KEY,
            business_name VARCHAR(150) NOT NULL,
            contact_name VARCHAR(120) NOT NULL,
            city VARCHAR(80) NOT NULL,
            region VARCHAR(80),
            email VARCHAR(150),
            phone VARCHAR(40),
            website VARCHAR(200),
            monthly_cremations INTEGER,
            consent BOOLEAN NOT NULL DEFAULT FALSE,
            mode INTEGER NOT NULL,
            answers JSON NOT NULL,              -- copia: pregunta, alternativa y % al momento de responder
            category_scores JSON NOT NULL,
            total_pct DOUBLE PRECISION,
            level VARCHAR(40),
            is_partial BOOLEAN NOT NULL DEFAULT FALSE,
            suggested_plan JSON,
            status VARCHAR(20) NOT NULL DEFAULT 'nuevo',   -- nuevo | contactado | demo | cliente | descartado
            notes TEXT,
            linked_tenant_id INTEGER REFERENCES sys_tenants(id) ON DELETE SET NULL,
            created_by INTEGER REFERENCES sys_users(id) ON DELETE SET NULL,
            sent_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_sys_diagnostics_created ON sys_diagnostics(created_at);

        ALTER TABLE sys_saas_config ADD COLUMN IF NOT EXISTS diagnostic_config JSON;
    """)

    conn = op.get_bind()
    if conn.execute(sa.text("SELECT COUNT(*) FROM sys_diagnostic_categories")).scalar():
        _grant_to_app_role()
        return
    cat_ids = {}
    for i, (key, name, weight, feature) in enumerate(CATEGORIES):
        cat_ids[key] = conn.execute(
            sa.text("""INSERT INTO sys_diagnostic_categories (key, name, weight, vinzer_feature, sort_order)
                       VALUES (:k, :n, :w, :f, :o) RETURNING id"""),
            {"k": key, "n": name, "w": weight, "f": feature, "o": i},
        ).scalar()
    for i, (cat, text, help_, options, na, modes, rec, feature) in enumerate(QUESTIONS):
        conn.execute(
            sa.text("""INSERT INTO sys_diagnostic_questions
                       (category_id, text, help, options, allows_na, modes, recommendation, vinzer_feature, sort_order)
                       VALUES (:c, :t, :h, CAST(:op AS JSON), :na, CAST(:m AS JSON), :r, :f, :o)"""),
            {"c": cat_ids[cat], "t": text, "h": help_, "op": json.dumps(options, ensure_ascii=False), "na": na,
             "m": json.dumps(modes), "r": rec, "f": feature, "o": i},
        )
    _grant_to_app_role()


def _grant_to_app_role() -> None:
    from sqlalchemy.engine.url import make_url
    from app.core.config import settings

    app_user = make_url(settings.SQLALCHEMY_DATABASE_URL).username or ''
    if not app_user.replace('_', '').isalnum():
        return
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{app_user}') THEN
                GRANT SELECT, INSERT, UPDATE, DELETE ON sys_diagnostic_categories, sys_diagnostic_questions, sys_diagnostics TO "{app_user}";
                GRANT USAGE, SELECT ON SEQUENCE sys_diagnostic_categories_id_seq, sys_diagnostic_questions_id_seq, sys_diagnostics_id_seq TO "{app_user}";
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE sys_saas_config DROP COLUMN IF EXISTS diagnostic_config;
        DROP TABLE IF EXISTS sys_diagnostics CASCADE;
        DROP TABLE IF EXISTS sys_diagnostic_questions CASCADE;
        DROP TABLE IF EXISTS sys_diagnostic_categories CASCADE;
    """)
