"""
Clear Operational Data Script - SaaS Vincer & Creator Reset
===========================================================
This script performs a complete clean-up of the database to prepare for production:
1. Deletes all media library entries (web_media_library).
2. Deletes all receipts (sys_receipts) to leave receipt management empty.
3. Deletes all customers, pets, cremations, partner links, and memorials completely.
4. Deletes all other tenants, leaving ONLY tenant ID 1 ("SaaS Vincer").
5. Renames the sole tenant to "SaaS Vincer" and elevates it to the "ULTRA" subscription plan.
6. Keeps only the core subscription plans (sys_subscription_plans) and modules.
7. Preserves only the main Super Creator admin account (creator@saascrematorio.cl) linked to "SaaS Vincer".

Usage (from backend/ directory):
    python scripts/database/clear_operational_data.py
"""
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from sqlalchemy import text
from app.database import SessionLocal

def main():
    print("==========================================================")
    print("   SaaS Vincer - Pristine Database Production Reset")
    print("==========================================================")
    print("[WARNING] This script will permanently delete all operational")
    print("records, memorials, other tenants, receipts, and media.")
    print("Only the Creator admin account, core plans, global templates,")
    print("and the single 'SaaS Vincer' ULTRA tenant will remain.")
    print("==========================================================")

    db = SessionLocal()
    try:
        # Start a secure transaction
        print("[..] Executing production reset inside database transaction...")

        queries = [
            # 1. Partner Link Commissions and Links
            ("Purging Commissions", "DELETE FROM ptn_partner_commissions;"),
            ("Purging Partner Links", "DELETE FROM ptn_partner_links;"),

            # 2. Veterinary Accounts
            ("Purging Veterinary Accounts", "DELETE FROM sys_veterinaries;"),

            # 3. Operations Tasks, Certificates, Evidence and Documents
            ("Purging Logistics Tasks", "DELETE FROM ops_logistics_tasks;"),
            ("Purging Generated Certificates", "DELETE FROM ops_certificates;"),
            ("Purging Order Step Evidence", "DELETE FROM ops_order_evidence;"),
            ("Purging Operations Documents", "DELETE FROM ops_documents;"),

            # 4. Cremation Child Records
            ("Purging Technical Cremation Info", "DELETE FROM oc_cremation_technical;"),
            ("Purging Cremation Details", "DELETE FROM oc_details;"),
            ("Purging Cremation Financial Records", "DELETE FROM oc_financial;"),
            ("Purging Cremation Logistics", "DELETE FROM oc_logistics;"),
            ("Purging Cremation Scheduling", "DELETE FROM oc_scheduling;"),
            ("Purging Cremation Plans Associated", "DELETE FROM oc_plans;"),
            ("Purging Cremation Products Associated", "DELETE FROM oc_products;"),
            ("Purging Cremation Services Associated", "DELETE FROM oc_services;"),

            # 5. Cremation Main Records
            ("Purging Cremation Orders", "DELETE FROM oc_cremations;"),

            # 6. Web Form Submissions & Media Library
            ("Purging Form Submissions", "DELETE FROM web_form_submissions;"),
            ("Purging Media Library", "DELETE FROM web_media_library;"),

            # 7. Catalog Plan Associations and catalog listings
            ("Purging Plan Products associations", "DELETE FROM srv_plan_products;"),
            ("Purging Plan Services associations", "DELETE FROM srv_plan_services;"),
            ("Purging Catalog Plans", "DELETE FROM srv_plans;"),
            ("Purging Catalog Services", "DELETE FROM srv_services;"),
            ("Purging Weight Pricing Tables", "DELETE FROM srv_weight_pricing;"),

            # 8. Inventory Products, Categories and Providers
            ("Purging Products catalog", "DELETE FROM inv_products;"),
            ("Purging Inventory Categories", "DELETE FROM inv_categories;"),
            ("Purging Inventory Providers", "DELETE FROM inv_providers;"),

            # 9. SaaS System Logs, Temporary Tokens, Billing and Subscriptions
            ("Purging Temporary Tokens", "DELETE FROM sys_temporary_tokens;"),
            ("Purging System Audit Logs", "DELETE FROM sys_audit_logs;"),
            ("Purging Announcement Views", "DELETE FROM sys_user_announcement_views;"),
            ("Purging Tenant Announcements", "DELETE FROM sys_tenant_announcements;"),
            ("Purging Billing Transactions", "DELETE FROM sys_billing_transactions;"),
            ("Purging Tenant Subscriptions", "DELETE FROM sys_tenant_subscriptions;"),
            ("Purging System Coupons", "DELETE FROM sys_coupons;"),
            ("Purging Table Configurations", "DELETE FROM sys_table_configurations;"),
            ("Purging Tenant Billing Info", "DELETE FROM sys_tenant_billing_info;"),
            ("Purging System Receipts (Empty Receipt List)", "DELETE FROM sys_receipts;"),

            # 10. Purge Memorials completely as requested
            ("Purging Dedications", "DELETE FROM rec_dedicatoria;"),
            ("Purging Memorials", "DELETE FROM rec_recuerdos;"),

            # 11. Purge all pets and customers completely
            ("Purging Pets", "DELETE FROM crm_pets;"),
            ("Purging Customers", "DELETE FROM crm_customers;"),

            # 12. Purge themes for other tenants
            ("Purging Themes", "DELETE FROM web_theme_config WHERE tenant_id != 1;"),

            # 13. Purge tenant module configs for other tenants
            ("Purging Tenant Module Configs", "DELETE FROM auth_tenant_module_configs WHERE tenant_id != 1;"),

            # 14. Purge user module permissions
            ("Purging User Module Permissions", "DELETE FROM auth_user_module_permissions WHERE user_id NOT IN (SELECT id FROM sys_users WHERE role = 'creator' OR email = 'creator@saascrematorio.cl');"),

            # 15. Purge users EXCEPT the Creator admin account
            ("Purging other Users", "DELETE FROM sys_users WHERE role != 'creator' AND email != 'creator@saascrematorio.cl';"),

            # 16. Purge workflow steps for other tenants
            ("Purging Workflow Steps", "DELETE FROM ops_workflow_steps WHERE tenant_id != 1;"),

            # 17. Purge templates & notifications owned by other tenants
            ("Purging other tenant Certificate Templates", "DELETE FROM ops_certificate_templates WHERE tenant_id != 1 AND tenant_id IS NOT NULL;"),
            ("Purging other tenant Farewell Templates", "DELETE FROM ops_farewell_templates WHERE tenant_id != 1 AND tenant_id IS NOT NULL;"),
            ("Purging other tenant Notifications", "DELETE FROM sys_notifications WHERE tenant_id != 1 AND tenant_id IS NOT NULL;"),

            # 18. Purge other tenants EXCEPT Vincer tenant (ID 1)
            ("Purging other Tenants", "DELETE FROM sys_tenants WHERE id != 1;"),
        ]

        for desc, query in queries:
            print(f"  -> {desc}...")
            db.execute(text(query))
        
        # Look up the ULTRA plan ID in database to bind it cleanly
        result = db.execute(text("SELECT id FROM sys_subscription_plans WHERE name = 'ULTRA' LIMIT 1")).fetchone()
        ultra_plan_id = result[0] if result else 4 # Fallback to 4 if not found
        print(f"  -> Found ULTRA Plan ID: {ultra_plan_id}")

        # Ensure Tenant ID 1 is perfectly set as "SaaS Vincer" on the "ULTRA" plan
        print("  -> Configuring 'SaaS Vincer' Tenant (ID 1) to ULTRA plan...")
        db.execute(text(f"""
            UPDATE sys_tenants 
            SET name = 'SaaS Vincer',
                short_name = 'Vincer',
                slug = 'vincer',
                plan = 'ULTRA',
                subscription_plan_id = {ultra_plan_id},
                status = 'active'
            WHERE id = 1;
        """))

        # Link Creator user to Tenant ID 1
        print("  -> Linking Super Creator Admin to 'SaaS Vincer' Tenant...")
        db.execute(text("""
            UPDATE sys_users 
            SET tenant_id = 1 
            WHERE email = 'creator@saascrematorio.cl' OR role = 'creator';
        """))

        # Commit the transaction
        db.commit()
        print("\n[SUCCESS] The database has been successfully reset to a pristine state.")
        print("          - Preserved plans and SuperAdmin Creator account.")
        print("          - Tenant 1 elevated to 'SaaS Vincer' on the ULTRA plan.")
        print("          - Receipts, media library, and operational data completely empty.")
        print("==========================================================")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Failed to reset database: {e}")
        print("        Transaction was fully rolled back to prevent corruption.")
        print("==========================================================")
    finally:
        db.close()

if __name__ == "__main__":
    main()
