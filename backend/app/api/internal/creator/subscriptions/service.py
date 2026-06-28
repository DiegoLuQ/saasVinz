from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from app.utils import tz
from app import models
from app.api.internal.creator.subscriptions.models import BillingTransaction, Receipt, ReceiptStatus
from app.api.internal.admin.models import SaaSConfig
import logging

logger = logging.getLogger(__name__)

class ReceiptService:
    @staticmethod
    def create_receipt_from_transaction(db: Session, transaction_id: int) -> Receipt:
        """
        Creates a professional receipt record from a completed billing transaction.
        Snapshots tenant and plan data at the moment of issuance.
        """
        try:
            # 1. Fetch transaction with related data
            transaction = db.query(BillingTransaction).filter(BillingTransaction.id == transaction_id).first()
            if not transaction:
                logger.error(f"Transaction {transaction_id} not found for receipt generation")
                return None
            
            if transaction.payment_status != "completed":
                logger.warning(f"Attempted to generate receipt for non-completed transaction {transaction_id}")
                return None

            # 2. Check if receipt already exists for this transaction
            existing_receipt = db.query(Receipt).filter(Receipt.transaction_id == transaction_id).first()
            if existing_receipt:
                return existing_receipt

            # 3. Snapshot Tenant Data
            tenant = transaction.tenant
            if not tenant:
                logger.error(f"Tenant not found for transaction {transaction_id}")
                return None

            # 4. Generate Receipt Number using DB function
            result = db.execute(text("SELECT generate_receipt_number()"))
            receipt_number = result.fetchone()[0]

            # 4.1 Fetch SaaS Config (Issuer Data)
            saas_config = db.query(SaaSConfig).first()

            # 5. Determine period dates (fallback to transaction dates if not available)
            # Typically a subscription covers 1 month or 1 year from the payment date
            period_start = transaction.payment_date or transaction.created_at
            
            # Use billing_end_date from tenant if it was just updated, or calculate based on cycle
            period_end = tenant.billing_end_date
            if not period_end:
                 from datetime import timedelta
                 if transaction.target_billing_cycle == "annual":
                     period_end = period_start + timedelta(days=365)
                 else:
                     period_end = period_start + timedelta(days=30)

            # 6. Fetch Plan Name
            plan_name = "Plan"
            if transaction.target_plan:
                plan_name = transaction.target_plan.name
            elif tenant.subscription_plan:
                plan_name = tenant.subscription_plan.name
            else:
                plan_name = tenant.plan or "Estándar"

            # 7. Create Receipt
            receipt = Receipt(
                receipt_number=receipt_number,
                tenant_id=tenant.id,
                transaction_id=transaction.id,
                tenant_name=tenant.name,
                tenant_email=tenant.email,
                tenant_phone=tenant.phone,
                tenant_address=tenant.address,
                # Issuer Snapshot
                issuer_name=saas_config.name if saas_config else "SaaSCrematorio",
                issuer_rut=saas_config.rut if saas_config else "77.777.777-7",
                issuer_address=saas_config.direccion if saas_config else "Av. Providencia 1234, Santiago",
                issuer_email=saas_config.correo if saas_config else "contacto@saascrematorio.com",
                issuer_logo_url=(
                    (saas_config.logo if saas_config.logo.startswith('/') or saas_config.logo.startswith('http') else '/' + saas_config.logo)
                    if saas_config and saas_config.logo else None
                ),
                plan_name=plan_name,
                billing_cycle=transaction.target_billing_cycle or "monthly",
                amount=transaction.amount,
                currency="CLP",
                period_start_date=period_start,
                period_end_date=period_end,
                pdf_url=f"/receipts/{receipt_number}.pdf", # Placeholder for dynamic generation
                status=ReceiptStatus.ACTIVE,
                issued_at=tz.get_now()
            )

            db.add(receipt)
            db.commit()
            db.refresh(receipt)
            
            logger.info(f"Generated receipt {receipt_number} for transaction {transaction_id}")
            return receipt

        except Exception as e:
            logger.error(f"Error generating automatic receipt: {str(e)}")
            db.rollback()
            return None
