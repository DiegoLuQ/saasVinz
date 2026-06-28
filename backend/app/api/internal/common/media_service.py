import os
import uuid
# from PIL import Image, ImageOps (Lazy Import)
# from moviepy import VideoFileClip (Lazy Import)
from app.utils.r2 import upload_file_to_r2, delete_file_from_r2
from app.core.config import settings
from sqlalchemy.orm import Session
from app.api.internal.common.models import MediaLibrary
from datetime import datetime

class MediaService:
    @staticmethod
    def process_image(file_path: str, ratio: str = "original", target_format: str = "WEBP", processing_mode: str = "optimized") -> str:
        """
        Procesa una imagen: recorta al ratio, escala (opcional) y convierte a WEBP.
        """
        try:
            from PIL import Image, ImageOps
            img = Image.open(file_path)
            
            # 0. EXIF Transpose (Fix rotation from mobile photos)
            try:
                img = ImageOps.exif_transpose(img)
            except Exception as e:
                print(f"Warning Transposing EXIF: {e}")

            # Preserve Transparency for WEBP
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")
        except ImportError:
            print("WARNING: 'Pillow' (PIL) no está instalada. Saltando procesamiento de imagen.")
            return file_path
        except Exception as e:
            print(f"Error al abrir la imagen: {e}")
            return file_path
        
        # 1. Lógica de recorte por Ratio
        if ratio != "original":
            w, h = img.size
            if ratio == "1:1":
                min_dim = min(w, h)
                left = (w - min_dim) / 2
                top = (h - min_dim) / 2
                right = (w + min_dim) / 2
                bottom = (h + min_dim) / 2
                img = img.crop((left, top, right, bottom))
            elif ratio == "16:9":
                target_ratio = 16/9
                if w/h > target_ratio: # más ancho que 16:9
                    new_w = h * target_ratio
                    left = (w - new_w) / 2
                    img = img.crop((left, 0, left + new_w, h))
                else: # más alto que 16:9
                    new_h = w / target_ratio
                    top = (h - new_h) / 2
                    img = img.crop((0, top, w, top + new_h))
            elif ratio == "9:16":
                target_ratio = 9/16
                if w/h > target_ratio:
                    new_w = h * target_ratio
                    left = (w - new_w) / 2
                    img = img.crop((left, 0, left + new_w, h))
                else:
                    new_h = w / target_ratio
                    top = (h - new_h) / 2
                    img = img.crop((0, top, w, top + new_h))

        # 2. Redimensionar si es modo optimizado (Public Content)
        if processing_mode == "optimized":
            w, h = img.size
            max_dim = 1024 # Standard for SaaS optimized images
            if ratio == "1:1":
                img = img.resize((max_dim, max_dim), Image.Resampling.LANCZOS)
            elif w > max_dim or h > max_dim:
                img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        elif processing_mode == "original":
            # high quality but still limit to something reasonable for web (e.g. 4K)
            w, h = img.size
            if w > 3840 or h > 3840:
                img.thumbnail((3840, 3840), Image.Resampling.LANCZOS)
        
        output_path = f"{file_path}_processed.webp"
        
        # 3. Compresión Iterativa (Cuello de Botella)
        quality = 80 if processing_mode == "optimized" else 95
        img.save(output_path, format=target_format, quality=quality, optimize=True)
        
        # Lógica de peso máximo
        max_size = (500 * 1024) if processing_mode == "optimized" else (2048 * 1024) # 500KB vs 2MB
        attempts = 0
        
        while os.path.getsize(output_path) > max_size and quality > 30 and attempts < 6:
            quality -= 10
            img.save(output_path, format=target_format, quality=quality, optimize=True)
            attempts += 1
                
        return output_path

    @staticmethod
    def process_video(file_path: str, processing_mode: str = "optimized") -> str:
        """
        Optimiza un video reduciendo bitrate y resolución si es excesiva.
        """
        try:
            from moviepy import VideoFileClip
            clip = VideoFileClip(file_path)
        except ImportError:
            print("WARNING: 'moviepy' no está instalada. Saltando procesamiento de video.")
            return file_path
        except Exception as e:
            print(f"Error al abrir el video: {e}")
            return file_path
            
        output_path = f"{file_path}_processed.mp4"
        
        # 1. Resolución
        # Si es original, mantenemos. Si es optimizado, bajamos a 1080p máximo.
        if processing_mode == "optimized" and clip.h > 1080:
            clip = clip.resized(height=1080)
            
        # 2. Bitrate (Calidad vs Peso)
        # Original: 8000k (Alta fidelidad), Optimizado: 2000k (SaaS estándar)
        target_bitrate = "8000k" if processing_mode == "original" else "2000k"
        
        clip.write_videofile(
            output_path, 
            codec="libx264", 
            audio_codec="aac", 
            bitrate=target_bitrate, 
            temp_audiofile="temp-audio.m4a", 
            remove_temp=True,
            logger=None # Avoid verbose output
        )
        clip.close()
        return output_path

    @classmethod
    def upload_media(cls, db: Session, local_path: str, media_type: str, category: str, ratio: str, description: str, alt_text: str, processing_mode: str = "optimized", custom_prefix: str = None, tenant_id: int = None):
        """
        Orquestador: Optimiza, sube a R2 y guarda en DB.
        """
        processed_path = None
        try:
            # Conditional Processing based on mode
            if media_type == "image":
                processed_path = cls.process_image(local_path, ratio, processing_mode=processing_mode)
            elif media_type == "video":
                processed_path = cls.process_video(local_path, processing_mode=processing_mode)
            else:
                processed_path = local_path # Fallback


            # Decidir almacenamiento: R2 o Local
            # Determine file extension based on processing
            if media_type == "image":
                ext = ".webp"
            elif media_type == "video" and processing_mode != "original":
                ext = ".mp4"
            else:
                ext = os.path.splitext(local_path)[1]
            
            # Naming convention: {prefix}_{uuid}.{ext}
            file_uuid = uuid.uuid4()
            filename = f"{custom_prefix}_{file_uuid}{ext}" if custom_prefix else f"{file_uuid}{ext}"
            unique_name = f"{category}/{filename}"
            
            if settings.USE_R2:
                # Use 'recuerdos' folder if category matches
                cloud_folder = "library" if category != "recuerdos" else "recuerdos"
                if tenant_id:
                    cloud_name = f"tenant_{tenant_id}/{cloud_folder}/{filename}" if category == "recuerdos" else f"tenant_{tenant_id}/library/{unique_name}"
                else:
                    cloud_name = f"{cloud_folder}/{filename}" if category == "recuerdos" else f"library/{unique_name}"
                r2_url = upload_file_to_r2(processed_path, settings.R2_BUCKET_NAME, cloud_name)
                if not r2_url:
                    raise Exception("Failed to upload to R2")
            else:
                # Local Storage
                # Calculate storage path relative to this file: backend/app/api/internal/common/
                # We want: backend/app/static/storage
                start_dir = os.path.dirname(os.path.abspath(__file__))
                storage_root = os.path.abspath(os.path.join(start_dir, "../../../../static/storage"))
                
                if tenant_id:
                    storage_dir = os.path.join(storage_root, f"tenant_{tenant_id}", category)
                    os.makedirs(storage_dir, exist_ok=True)
                    final_filename = f"{uuid.uuid4()}{ext}"
                    final_path = os.path.join(storage_dir, final_filename)
                    r2_url = f"/storage/tenant_{tenant_id}/{category}/{final_filename}"
                else:
                    storage_dir = os.path.join(storage_root, category)
                    os.makedirs(storage_dir, exist_ok=True)
                    final_filename = f"{uuid.uuid4()}{ext}"
                    final_path = os.path.join(storage_dir, final_filename)
                    r2_url = f"/storage/{category}/{final_filename}"
                
                # Move/Copy file
                import shutil
                shutil.copy2(processed_path, final_path)

            # Obtener info para DB
            file_size = os.path.getsize(processed_path)
            
            # Guardar en DB
            media_item = MediaLibrary(
                url=r2_url,
                tenant_id=tenant_id,  # NULL = recurso global; si no, dueño del archivo
                media_type=media_type,
                category=category,
                ratio=ratio,
                description=description,
                alt_text=alt_text,
                file_size=file_size
            )
            
            # Obtener datos extras (and generate thumbnail for video)
            thumbnail_url = None
            if media_type == "image":
                try:
                    from PIL import Image
                    with Image.open(processed_path) as img:
                        media_item.width, media_item.height = img.size
                except Exception as e:
                    print(f"Error obteniendo dimensiones de imagen: {e}")
                    
            elif media_type == "video":
                try:
                    from moviepy import VideoFileClip
                    clip = VideoFileClip(processed_path)
                    media_item.width, media_item.height = clip.size
                    media_item.duration = clip.duration
                    
                    # Generate Thumbnail
                    try:
                        thumb_local_path = f"{processed_path}_thumb.webp"
                        # Capture frame at 1s or middle if short
                        t = 1.0 if clip.duration > 1.0 else clip.duration / 2
                        clip.save_frame(thumb_local_path, t=t)
                        
                        # Upload Thumbnail
                        thumb_ext = ".webp"
                        thumb_unique_name = f"{category}/{uuid.uuid4()}_thumb{thumb_ext}"
                        
                        if settings.USE_R2:
                            thumb_cloud_name = f"library/{thumb_unique_name}"
                            thumbnail_url = upload_file_to_r2(thumb_local_path, settings.R2_BUCKET_NAME, thumb_cloud_name)
                        else:
                            # Local
                            start_dir = os.path.dirname(os.path.abspath(__file__))
                            storage_root = os.path.abspath(os.path.join(start_dir, "../../../../static/storage"))
                            storage_dir = os.path.join(storage_root, category)
                            
                            thumb_final_filename = f"{uuid.uuid4()}_thumb{thumb_ext}"
                            thumb_final_path = os.path.join(storage_dir, thumb_final_filename)
                            
                            import shutil
                            shutil.copy2(thumb_local_path, thumb_final_path)
                            thumbnail_url = f"/storage/{category}/{thumb_final_filename}"
                        
                        if os.path.exists(thumb_local_path):
                            os.remove(thumb_local_path)
                            
                    except Exception as e:
                        print(f"Error generating thumbnail: {e}")
                    
                    clip.close()
                except Exception as e:
                    print(f"Error obteniendo info de video: {e}")

            media_item.thumbnail_url = thumbnail_url

            db.add(media_item)
            db.commit()
            db.refresh(media_item)
            return media_item

        finally:
            # Limpiar archivos temporales
            if processed_path and os.path.exists(processed_path) and processed_path != local_path:
                os.remove(processed_path)
    @staticmethod
    def delete_media(db: Session, media_item: MediaLibrary):
        """
        Elimina el archivo de almacenamiento (R2 o Local) y de la DB via instancia.
        """
        try:
            items_to_delete = [media_item.url]
            if media_item.thumbnail_url:
                items_to_delete.append(media_item.thumbnail_url)

            for url in items_to_delete:
                if not url: continue
                
                # Check if R2
                if settings.USE_R2 and settings.R2_PUBLIC_URL and url.startswith(settings.R2_PUBLIC_URL):
                    # Extract Key: https://pub-xxx.r2.dev/ KEY
                    key = url.replace(f"{settings.R2_PUBLIC_URL}/", "")
                    delete_file_from_r2(settings.R2_BUCKET_NAME, key)
                
                # Check if Local
                elif url.startswith("/storage"):
                    # Extract path: /storage/category/filename -> app/static/storage/category/filename
                    # Assuming url format matches what we constructed in upload
                    rel_path = url.lstrip("/") # storage/category/filename
                    # start_dir in app/api/internal/common/media_service.py
                    # We need to reach app/
                    # We know STATIC_DIR=app/static from .env or config
                    # Let's map dynamically relative to backend root
                    
                    # Safer way: construct absolute path based on known structure
                    # /storage maps to backend/app/static/storage
                    
                    # Get backend root (3 levels up from this file? No, verify.)
                    # this file: backend/app/api/internal/common/media_service.py
                    # backend root: backend/
                    
                    current_dir = os.path.dirname(os.path.abspath(__file__))
                    backend_root = os.path.abspath(os.path.join(current_dir, "../../../../"))
                    local_storage_path = os.path.join(backend_root, "app/static", rel_path)
                    
                    if os.path.exists(local_storage_path):
                        os.remove(local_storage_path)

            db.delete(media_item)
            db.commit()
            return True
        except Exception as e:
            print(f"Error deleting media: {e}")
            db.rollback()
            return False

    @classmethod
    def delete_media_by_url(cls, db: Session, url: str):
        """
        Busca un item en MediaLibrary por su URL y lo elimina.
        Si no existe en DB pero es una URL local (/static/ o /storage/), 
        intenta eliminar el archivo físico directamente (compatibilidad con legacy).
        """
        if not url:
            return False

        # 1. Intentar buscar en MediaLibrary (Nuevos archivos)
        media_item = db.query(MediaLibrary).filter(MediaLibrary.url == url).first()
        if media_item:
            return cls.delete_media(db, media_item)

        # 2. Fallback: Eliminar archivo físico si es local (Legacy)
        try:
            # Normalizar URL local
            # /static/tenants/.. -> app/static/tenants/..
            # /storage/.. -> app/static/storage/..
            
            current_dir = os.path.dirname(os.path.abspath(__file__))
            backend_root = os.path.abspath(os.path.join(current_dir, "../../../../"))
            
            local_path = None
            if url.startswith("/storage"):
                local_path = os.path.join(backend_root, "app/static", url.lstrip("/"))
            elif url.startswith("/static"):
                local_path = os.path.join(backend_root, "app", url.lstrip("/"))
            
            if local_path and os.path.exists(local_path):
                os.remove(local_path)
                print(f"DEBUG: Archivo legacy eliminado físicamente: {local_path}")
                return True
        except Exception as e:
            print(f"Error deleting legacy physical file: {e}")
        
        return False

    @staticmethod
    def get_public_url(url: str) -> str:
        """
        Helper to ensure a URL is public. 
        If it's already an absolute URL (http), returns it.
        If it's a relative path and R2 is enabled, prepends R2_PUBLIC_URL.
        """
        if not url:
            return ""
        if url.startswith("http"):
            return url
        
        # If it starts with /static/ or /storage/, assume it's a local relative path
        if url.startswith("/"):
            return url
            
        # For legacy relative paths in R2 (e.g. "pets/uuid.webp")
        if settings.USE_R2 and settings.R2_PUBLIC_URL:
            return f"{settings.R2_PUBLIC_URL}/{url.lstrip('/')}"
            
        return url

    @classmethod
    async def upload_base64_media(cls, db: Session, base64_str: str, category: str, **kwargs) -> str:
        """
        Decodifica una cadena base64, la guarda temporalmente y la sube vía MediaService.
        """
        import base64
        import binascii
        
        try:
            if ";" in base64_str and "base64," in base64_str:
                header, base64_str = base64_str.split("base64,", 1)
                ext = "." + header.split("/")[-1].split(";")[0]
            else:
                ext = ".webp" # Fallback
                
            image_data = base64.b64decode(base64_str)
        except (binascii.Error, ValueError) as e:
            raise Exception(f"Fallo al decodificar base64: {e}")

        # Guardar temporalmente
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_filename = f"base64_{uuid.uuid4().hex[:8]}{ext}"
        temp_path = os.path.join(temp_dir, temp_filename)
        
        with open(temp_path, "wb") as f:
            f.write(image_data)
            
        try:
            # Subir usando el flujo estándar
            media_item = cls.upload_media(
                db=db,
                local_path=temp_path,
                media_type="image",
                category=category,
                **kwargs
            )
            return media_item.url
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
