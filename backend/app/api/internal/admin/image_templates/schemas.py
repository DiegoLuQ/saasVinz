from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Any, Dict
from datetime import datetime


AspectRatio = Literal["9:16", "3:4", "4:3", "1:1"]
FontFamily = Literal["Playfair Display", "Cormorant Garamond", "Lora"]
TextBinding = Literal["pet_name", "date", "phrase", "static"]
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
    is_active: Optional[bool] = None


class ImageTemplateInDB(ImageTemplateBase):
    id: int
    usage_count: int
    is_locked: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}
