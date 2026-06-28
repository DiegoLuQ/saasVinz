from fastapi import Request
from starlette.background import BackgroundTask
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.database import SessionLocal
from app.core.tenant_context import apply_bypass_rls
from app.core.client_ip import get_client_ip
from app import models
from app.core.config import settings
from jose import jwt, JWTError
import time
import json
import traceback

class AuditMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.time()
        path = scope["path"]
        method = scope["method"]
        
        ignore_paths = [
            "/static", "/storage", "/docs", "/redoc", "/openapi.json", 
            "/api/internal/audit-logs", 
            "/api/internal/notifications"
        ]
        
        if any(path.startswith(p) for p in ignore_paths) or method == "OPTIONS":
            await self.app(scope, receive, send)
            return
            
        if path.startswith("/api/public"):
            await self.app(scope, receive, send)
            return

        # Only capture body for state-changing internal API calls
        should_log = (
            method in ["POST", "PUT", "PATCH", "DELETE"] and 
            path.startswith("/api/internal")
        )
            
        if not should_log:
            try:
                await self.app(scope, receive, send)
            except Exception as e:
                try:
                    request = Request(scope, receive)
                    self.process_error_log(request, e)
                except:
                    pass
                raise e
            return

        response_status = [200]
        response_headers = []
        response_body_chunks = []

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                response_status[0] = message["status"]
                response_headers.clear()
                response_headers.extend(message.get("headers", []))
            elif message["type"] == "http.response.body":
                response_body_chunks.append(message.get("body", b""))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            try:
                request = Request(scope, receive)
                self.process_error_log(request, e)
            except:
                pass
            raise e

        status_code = response_status[0]
        response_body = b"".join(response_body_chunks)

        # Check content type and length
        content_type = ""
        content_length = None
        for k, v in response_headers:
            if k.lower() == b"content-type":
                content_type = v.decode("latin-1", errors="ignore")
            elif k.lower() == b"content-length":
                try:
                    content_length = int(v.decode("latin-1", errors="ignore"))
                except:
                    pass

        is_small_json = content_type.startswith("application/json") and (
            content_length is None or content_length <= 65536
        )

        response_body = response_body if is_small_json else None
        request = Request(scope, receive)

        import threading
        def run_in_thread():
            try:
                self.process_audit_log(request, status_code, start_time, response_body)
            except Exception as ex:
                print(f"Error in audit middleware process_audit_log: {ex}")
                traceback.print_exc()

        threading.Thread(target=run_in_thread, daemon=True).start()

    def process_audit_log(self, request: Request, status_code: int, start_time: float, body_bytes: bytes = None):
        method = request.method
        path = request.url.path
        
        # User extraction logic...
        user_info = self._get_user_from_token(request)
        if not user_info:
            return 
            
        user_id, tenant_id = user_info
        
        # Resource info extraction...
        path_parts = path.strip("/").split("/")
        resource_type = "unknown"
        resource_id = None
        
        if len(path_parts) >= 3 and path_parts[1] == "internal":
            resource_type = path_parts[2]
            if len(path_parts) > 3 and path_parts[3].isdigit():
                resource_id = int(path_parts[3])
        
        action_map = {
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete"
        }
        action = action_map.get(method, "unknown")
        
        status = "success" if 200 <= status_code < 300 else "error"
        if status_code >= 400 and status_code < 500:
            status = "warning"
            
        error_message = None
        if status != "success":
            error_message = f"HTTP {status_code}"
            
        # Extract Resource Name from Body
        resource_name = None
        details = None
        
        if body_bytes and status == "success":
            try:
                data = json.loads(body_bytes.decode())
                # Try common name fields
                if isinstance(data, dict):
                    resource_name = data.get("name") or data.get("title")
                    
                    if not resource_name:
                        first = data.get("first_name")
                        last = data.get("last_name")
                        if first and last:
                            resource_name = f"{first} {last}"
                        elif first:
                            resource_name = first
                    
                    # Store ID if we didn't get it from URL (e.g. POST create)
                    if not resource_id and "id" in data:
                        resource_id = data["id"]
                        
                    # Store minimal details (ID and Name) to save space, or important diffs
                    # For now just store the name logic result
            except:
                pass
                
        # Fallback for DELETE or when body doesn't help
        if not resource_name and method == "DELETE":
             # Parsing delete success messages like "Cliente Juan Perez eliminado" could work 
             # but relies on consistent messaging.
             pass

        ip_address = get_client_ip(request)
        user_agent = request.headers.get("user-agent")
        
        db = SessionLocal()
        try:
            apply_bypass_rls(db)
            audit_log = models.AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                status=status,
                status_code=status_code,
                resource_name=resource_name,
                details=details,
                error_message=error_message,
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.add(audit_log)
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

    def process_error_log(self, request: Request, error: Exception):
        # Log unhandled exceptions (500s)
        method = request.method
        
        # Extract user info manually from token
        user_info = self._get_user_from_token(request)
        
        # Sin usuario identificado no hay a quién atribuir el error; con usuario
        # pero sin tenant (creator) sí se registra como acción global.
        if not user_info:
            return
        user_id, tenant_id = user_info
            
        # Extract resource info
        path = request.url.path
        path_parts = path.strip("/").split("/")
        resource_type = "unknown"
        if len(path_parts) >= 3:
            resource_type = path_parts[2]
            
        action = f"error_{method.lower()}"
        status = "error"
        status_code = 500
        error_message = str(error)
        
        # Limit error message length
        if len(error_message) > 500:
            error_message = error_message[:500] + "..."
            
        ip_address = get_client_ip(request)
        user_agent = request.headers.get("user-agent")
        
        db = SessionLocal()
        try:
            apply_bypass_rls(db)
            audit_log = models.AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=None,
                status=status,
                status_code=status_code,
                error_message=error_message,
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.add(audit_log)
            db.commit()
        finally:
            db.close()
            
    def _get_user_from_token(self, request: Request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            tenant_id = payload.get("tenant_id")

            if not user_id:
                return None

            # Los tokens del SuperAdmin (creator) no traen tenant_id. Antes eso
            # descartaba el log y el rol más privilegiado operaba sin auditoría.
            # Si actúa sobre un tenant concreto, viene en el header X-Tenant-ID;
            # si no, se registra como acción global (tenant_id NULL).
            if tenant_id is None:
                header_tenant = request.headers.get("x-tenant-id")
                if header_tenant and header_tenant.isdigit():
                    tenant_id = header_tenant

            return (int(user_id), int(tenant_id) if tenant_id is not None else None)
        except Exception:
            return None
