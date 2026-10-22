from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

ProviderKey = Literal["gemini", "anthropic", "openai", "openrouter", "deepseek"]


class AiProviderBase(BaseModel):
    provider: ProviderKey
    name: str = Field(..., min_length=1, max_length=120)
    model: str = Field(..., min_length=1, max_length=160)
    is_active: bool = True
    use_for_text: bool = False
    use_for_image: bool = False
    cost_per_use_usd: float = Field(0, ge=0, le=100)
    priority: int = Field(1, ge=1, le=20)


class AiProviderCreate(AiProviderBase):
    api_key: str = Field(..., min_length=8, max_length=500)


class AiProviderUpdate(BaseModel):
    provider: Optional[ProviderKey] = None
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    model: Optional[str] = Field(None, min_length=1, max_length=160)
    # Vacío o ausente = conservar la key guardada.
    api_key: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    use_for_text: Optional[bool] = None
    use_for_image: Optional[bool] = None
    cost_per_use_usd: Optional[float] = Field(None, ge=0, le=100)
    priority: Optional[int] = Field(None, ge=1, le=20)


class AiProviderOut(AiProviderBase):
    id: int
    api_key_hint: Optional[str] = None
    last_test_at: Optional[datetime] = None
    last_test_ok: Optional[bool] = None
    last_test_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AiProviderTestRequest(BaseModel):
    """Probar antes de guardar. Sin api_key y con `id` se usa la key guardada."""
    id: Optional[int] = None
    provider: ProviderKey
    model: str = Field(..., min_length=1, max_length=160)
    api_key: Optional[str] = Field(None, max_length=500)


class AiProviderTestResult(BaseModel):
    ok: bool
    message: str
    detail: Optional[str] = None
