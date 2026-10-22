from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Any, Dict
from datetime import datetime


AspectRatio = Literal["9:16", "4:5", "3:4", "4:3", "1:1"]
FontFamily = Literal[
    "Playfair Display", "Cormorant Garamond", "Lora", "Cinzel", "Great Vibes",
    "Alex Brush", "Dancing Script", "Montserrat", "Quicksand",
]
# Mismas claves que template_bindings() en app/services/image_template_ai.py.
TextBinding = Literal[
    "pet_name", "species", "breed", "age", "size", "birth_date", "death_date", "life_range",
    "owner_name", "owner_phone", "owner_email",
    "tenant_name", "tenant_rut", "tenant_phone", "tenant_email", "tenant_address", "tenant_city", "tenant_legal_rep",
    "tenant_instagram", "tenant_facebook", "tenant_tiktok", "tenant_youtube", "tenant_website", "tenant_whatsapp",
    "date", "phrase", "ai_text", "static",
]
PhotoShape = Literal["circle", "square", "rounded"]


class BackgroundDef(BaseModel):
    type: Literal["color", "image"] = "color"
    value: str = "#0f172a"  # color hex or image url
    opacity: float = 1.0


class TextLayer(BaseModel):
    type: Literal["text"] = "text"
    id: str
    binding: TextBinding
    static_text: Optional[str] = None  # used when binding == 'static'
    # Positioning & sizing in % of the stage (0..100) so it scales between
    # aspect ratios without per-ratio overrides.
    x: float = Field(50, ge=0, le=100)
    y: float = Field(50, ge=0, le=100)
    width: float = Field(80, ge=5, le=100)
    font_family: FontFamily = "Playfair Display"
    font_size: float = Field(6, gt=0, le=40)  # % of stage height
    font_weight: Literal["400", "500", "600", "700"] = "500"
    italic: bool = False
    color: str = "#ffffff"
    align: Literal["left", "center", "right"] = "center"
    letter_spacing: float = 0.0
    shadow: bool = False


class PhotoLayer(BaseModel):
    type: Literal["photo"] = "photo"
    id: str
    x: float = Field(50, ge=0, le=100)
    y: float = Field(35, ge=0, le=100)
    width: float = Field(40, ge=5, le=100)   # % of stage width
    height: float = Field(40, ge=5, le=100)  # % of stage height
    shape: PhotoShape = "circle"
    border_color: str = "#ffffff"
    border_width: float = 0


class TemplateDefinition(BaseModel):
    background: BackgroundDef = BackgroundDef()
    layers: List[Any] = []  # list of TextLayer | PhotoLayer (validated by frontend)


class ImageTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    default_phrase: Optional[str] = Field(None, max_length=300)
    supported_ratios: List[AspectRatio] = Field(..., min_length=1)
    definition: Dict[str, Any]
    thumbnail_url: Optional[str] = None
    ai_text_prompt: Optional[str] = Field(None, max_length=3000)
    ai_image_prompt: Optional[str] = Field(None, max_length=3000)
    ai_text_max_chars: int = Field(500, ge=20, le=500)
    # None = global; con valor = exclusiva de ese tenant.
    tenant_id: Optional[int] = None
    is_active: bool = True


class ImageTemplateCreate(ImageTemplateBase):
    pass


class ImageTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    default_phrase: Optional[str] = Field(None, max_length=300)
    supported_ratios: Optional[List[AspectRatio]] = None
    definition: Optional[Dict[str, Any]] = None
    thumbnail_url: Optional[str] = None
    ai_text_prompt: Optional[str] = Field(None, max_length=3000)
    ai_image_prompt: Optional[str] = Field(None, max_length=3000)
    ai_text_max_chars: Optional[int] = Field(None, ge=20, le=500)
    tenant_id: Optional[int] = None
    is_active: Optional[bool] = None


class ImageTemplateInDB(ImageTemplateBase):
    id: int
    usage_count: int
    is_locked: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class AiTextTestRequest(BaseModel):
    """Prueba de prompt desde el editor del SuperAdmin con datos de ejemplo."""
    prompt: str = Field(..., min_length=1, max_length=3000)
    max_chars: int = Field(500, ge=20, le=500)


class AiTextResult(BaseModel):
    text: str
    chars: int
    max_chars: int
    duration_ms: Optional[int] = None


class AiImageResult(BaseModel):
    url: str
    # Generación registrada (para asociarle la imagen si el tenant la guarda).
    generation_id: Optional[int] = None
    duration_ms: Optional[int] = None


class SavedImageResult(BaseModel):
    url: str
