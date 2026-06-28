import sys
import os

# Add the backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from sqlalchemy import text

def seed_templates():
    db = SessionLocal()
    try:
        db.execute(text("SET app.bypass_rls = 'true'"))
        db.execute(text("SET app.current_tenant_id = ''"))
        print("Seeding default Certificate and Receipt Templates...")

        # 1. Default Certificate Template
        cert_tpl = db.query(models.CertificateTemplate).filter(
            models.CertificateTemplate.tenant_id == None,
            models.CertificateTemplate.category == "para mascotas"
        ).first()

        if not cert_tpl:
            cert_tpl = models.CertificateTemplate(
                tenant_id=None,
                name="Certificado Clásico de Cremación",
                category="para mascotas",
                paper_format="Carta",
                theme="Clásico",
                title="CERTIFICADO DE CREMACIÓN",
                subtitle="Homenaje a un compañero fiel",
                declaration_text="Certificamos que los restos de la mascota descrita fueron cremados con el debido respeto y solemnidad en nuestras instalaciones.",
                signature_text="Crematorio de Mascotas S.A.",
                memorial_message="Su recuerdo vivirá por siempre en nuestros corazones.",
                memorial_title="In Memoriam",
                header_logo_shape="square",
                background_logo_shape="square",
                is_default=True,
                sections_config={
                    "advantages_list": ["Cremación Individual", "Ánfora de Madera", "Certificado Oficial"]
                },
                sections_order=["header", "title", "content", "signature"]
            )
            db.add(cert_tpl)
            print("  - Default Certificate Template created.")

        # 2. Default Receipt Template
        receipt_tpl = db.query(models.CertificateTemplate).filter(
            models.CertificateTemplate.tenant_id == None,
            models.CertificateTemplate.category == "recibo_suscripcion"
        ).first()

        if not receipt_tpl:
            receipt_tpl = models.CertificateTemplate(
                tenant_id=None,
                name="Recibo de Suscripción Oficial",
                category="recibo_suscripcion",
                paper_format="Carta",
                theme="Clásico",
                title="RECIBO DE SUSCRIPCIÓN",
                subtitle="Comprobante de Pago Oficial",
                declaration_text="Agradecemos su suscripción y pago para el uso de nuestra plataforma SaaS Crematorios.",
                signature_text="Soporte SaaS Crematorio",
                memorial_message="Gracias por su confianza.",
                memorial_title="Detalles del Pago",
                header_logo_shape="square",
                background_logo_shape="square",
                is_default=True,
                sections_config={
                    "advantages_list": ["Soporte 24/7", "Acceso Completo", "Respaldos Automáticos"]
                },
                sections_order=["header", "title", "content", "signature"]
            )
            db.add(receipt_tpl)
            print("  - Default Receipt Template created.")

        db.commit()
        print("Template seeding complete!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding templates: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_templates()
