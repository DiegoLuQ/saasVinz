"""
Cliente mínimo de la API de Gemini (Google Generative Language, REST v1beta).

Se usa desde las plantillas de imagen para redes:
- generate_text: texto corto (dedicatoria/caption) con gemini-3.1-flash-lite.
- generate_image: ilustración a partir de la foto real de la mascota con
  gemini-3.1-flash-image (entrada imagen + texto, salida imagen).

La API key y el modelo vienen de Configuración Global → Plataformas IA
(app/services/ai_providers.py); este módulo no lee el .env.
"""
import base64
import logging
from typing import Optional, Tuple

from app.services.ai_errors import AiError, post_json

logger = logging.getLogger(__name__)

_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
_TEXT_TIMEOUT = 30.0
_IMAGE_TIMEOUT = 120.0


# Alias histórico: los routers capturan GeminiError para cualquier plataforma.
GeminiError = AiError


async def _generate(model: str, body: dict, timeout: float, api_key: str) -> dict:
    if not api_key:
        raise GeminiError("La generación con IA no está configurada en el servidor.")
    url = f"{_BASE_URL}/{model}:generateContent"
    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
    data = await post_json(url, headers=headers, body=body, timeout=timeout, label="Gemini", model=model)
    block = (data.get("promptFeedback") or {}).get("blockReason")
    if block:
        raise GeminiError("La IA bloqueó la solicitud por sus políticas de contenido. Ajusta el texto del prompt.", fallback=False)
    if not data.get("candidates"):
        raise GeminiError("La IA no devolvió resultados.")
    return data


def _parts(data: dict) -> list:
    cand = data["candidates"][0]
    if cand.get("finishReason") in ("SAFETY", "PROHIBITED_CONTENT", "IMAGE_SAFETY"):
        raise GeminiError("La IA bloqueó el resultado por sus políticas de contenido. Ajusta el prompt.", fallback=False)
    return (cand.get("content") or {}).get("parts") or []


async def generate_text(prompt: str, system: Optional[str] = None, temperature: float = 0.9,
                        *, api_key: str, model: str, max_tokens: int = 1024) -> str:
    body: dict = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}

    data = await _generate(model, body, _TEXT_TIMEOUT, api_key)
    text = "".join(p.get("text", "") for p in _parts(data) if not p.get("thought")).strip()
    if not text:
        raise GeminiError("La IA no devolvió texto.")
    return text


async def generate_image(
    prompt: str,
    image_bytes: bytes,
    mime_type: str,
    aspect_ratio: Optional[str] = None,
    *,
    api_key: str,
    model: str,
) -> Tuple[bytes, str]:
    """Devuelve (bytes, mime_type) de la imagen generada a partir de la foto."""
    body: dict = {
        "contents": [{
            "role": "user",
            "parts": [
                {"text": prompt},
                {"inlineData": {"mimeType": mime_type, "data": base64.b64encode(image_bytes).decode()}},
            ],
        }],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    if aspect_ratio:
        body["generationConfig"]["imageConfig"] = {"aspectRatio": aspect_ratio}

    data = await _generate(model, body, _IMAGE_TIMEOUT, api_key)
    for part in _parts(data):
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
            return base64.b64decode(inline["data"]), mime
    raise GeminiError("La IA no devolvió una imagen. Prueba con otra foto o ajusta el prompt.")
