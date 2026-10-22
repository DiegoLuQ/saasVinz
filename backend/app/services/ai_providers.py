"""
Plataformas de IA configurables (Configuración Global → Plataformas IA).

- PROVIDERS: catálogo de plataformas soportadas.
- resolve(db, kind): conexión activa marcada para 'text' o 'image'. Es la
  ÚNICA fuente de keys/modelos (no hay respaldo en el .env): sin conexión
  marcada, esa función de IA queda deshabilitada.
- generate_text / generate_image: llamadas independientes del proveedor.
- test_connection: prueba mínima para el botón "Probar conexión".

La ilustración desde foto está implementada con Gemini (flash-image) y con
OpenRouter (modelos de imagen vía /api/v1/images que acepten foto de referencia).
"""
import time
from dataclasses import dataclass
from typing import Optional, Tuple

import logging

from sqlalchemy.orm import Session

from app import models
from app.services import gemini
from app.services.ai_errors import AiError, get_json, post_json
from app.utils import secrets_box

PROVIDERS = {
    "gemini": {"label": "Google Gemini", "supports_image": True, "model_hint": "gemini-3.1-flash-lite"},
    "anthropic": {"label": "Claude (Anthropic)", "supports_image": False, "model_hint": "claude-haiku-5-5"},
    "openai": {"label": "ChatGPT (OpenAI)", "supports_image": False, "model_hint": "gpt-4.1-mini"},
    "openrouter": {"label": "OpenRouter", "supports_image": True, "model_hint": "google/gemini-2.5-flash"},
    "deepseek": {"label": "DeepSeek", "supports_image": False, "model_hint": "deepseek-chat"},
}

# APIs compatibles con OpenAI Chat Completions.
_OPENAI_COMPATIBLE = {
    "openai": "https://api.openai.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "deepseek": "https://api.deepseek.com",
}
_ANTHROPIC_URL = "https://api.anthropic.com/v1"
logger = logging.getLogger(__name__)
_TEXT_TIMEOUT = 30.0


@dataclass
class ResolvedProvider:
    provider: str
    model: str
    api_key: str
    name: str
    cost_per_use: float = 0.0

    @property
    def label(self) -> str:
        return PROVIDERS.get(self.provider, {}).get("label", self.provider)


def resolve_all(db: Session, kind: str) -> list:
    """Conexiones activas para 'text' o 'image' en orden de uso (principal primero,
    luego los respaldos por `priority`)."""
    flag = models.AiProvider.use_for_image if kind == "image" else models.AiProvider.use_for_text
    rows = (
        db.query(models.AiProvider)
        .filter(models.AiProvider.is_active.is_(True), flag.is_(True))
        .order_by(models.AiProvider.priority, models.AiProvider.id)
        .all()
    )
    out = []
    for row in rows:
        if kind == "image" and not PROVIDERS.get(row.provider, {}).get("supports_image"):
            continue
        key = secrets_box.decrypt(row.api_key_encrypted)
        if key:
            out.append(ResolvedProvider(row.provider, row.model, key, row.name, float(row.cost_per_use_usd or 0)))
    return out


def resolve(db: Session, kind: str) -> Optional[ResolvedProvider]:
    """La conexión principal de ese uso (o None si no hay ninguna)."""
    chain = resolve_all(db, kind)
    return chain[0] if chain else None


async def with_fallback(db: Session, kind: str, call):
    """Ejecuta `call(rp)` con la principal y, si falla con un error que no es del
    contenido, con cada respaldo en orden. Devuelve (resultado, rp_usada)."""
    chain = resolve_all(db, kind)
    if not chain:
        what = "ilustraciones" if kind == "image" else "textos"
        raise AiError(f"No hay una plataforma de IA configurada para {what}.")
    last_error = None
    for i, rp in enumerate(chain):
        try:
            return await call(rp), rp
        except AiError as e:
            last_error = e
            if not e.fallback or i == len(chain) - 1:
                break
            logger.warning("IA %s: %s (%s) falló: %s -> respaldo %s (%s)", kind, rp.name, rp.model, e,
                           chain[i + 1].name, chain[i + 1].model)
    raise last_error


def require(db: Session, kind: str) -> ResolvedProvider:
    rp = resolve(db, kind)
    if rp is None:
        what = "ilustraciones" if kind == "image" else "textos"
        raise AiError(f"No hay una plataforma de IA configurada para {what}.")
    return rp


async def _request_text(provider: str, model: str, api_key: str, prompt: str, system: Optional[str],
                        temperature: float, max_tokens: int) -> str:
    """Devuelve el texto (puede venir vacío). Errores HTTP → AiError."""
    if provider == "gemini":
        body: dict = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}
        data = await gemini._generate(model, body, _TEXT_TIMEOUT, api_key)
        return "".join(p.get("text", "") for p in gemini._parts(data) if not p.get("thought")).strip()

    if provider == "anthropic":
        body = {"model": model, "max_tokens": max_tokens, "temperature": min(temperature, 1.0),
                "messages": [{"role": "user", "content": prompt}]}
        if system:
            body["system"] = system
        data = await post_json(
            f"{_ANTHROPIC_URL}/messages",
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            body=body, timeout=_TEXT_TIMEOUT, label="Claude", model=model,
        )
        return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()

    if provider in _OPENAI_COMPATIBLE:
        messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
        body = {"model": model, "messages": messages}
        if provider == "openai":
            # Los modelos actuales de OpenAI usan max_completion_tokens y algunos
            # (razonamiento) rechazan temperature: se omite.
            body["max_completion_tokens"] = max_tokens
        else:
            body["max_tokens"] = max_tokens
            body["temperature"] = temperature
        data = await post_json(
            f"{_OPENAI_COMPATIBLE[provider]}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            body=body, timeout=_TEXT_TIMEOUT, label=PROVIDERS[provider]["label"], model=model,
        )
        choices = data.get("choices") or []
        return ((choices[0].get("message") or {}).get("content") or "").strip() if choices else ""

    raise AiError(f"Plataforma de IA no soportada: {provider}")


async def generate_text(rp: ResolvedProvider, prompt: str, system: Optional[str] = None,
                        temperature: float = 0.9, max_tokens: int = 1024) -> str:
    text = await _request_text(rp.provider, rp.model, rp.api_key, prompt, system, temperature, max_tokens)
    if not text:
        raise AiError("La IA no devolvió texto.")
    return text


async def _openrouter_image_model(model: str) -> Optional[dict]:
    """Ficha pública del modelo en el catálogo de imágenes de OpenRouter, o None si no es de imagen."""
    data = await get_json(f"{_OPENAI_COMPATIBLE['openrouter']}/images/models", headers={},
                          timeout=15.0, label="OpenRouter", model=model)
    return next((m for m in data.get("data", []) if m.get("id") == model), None)


def _accepts_reference(meta: dict) -> bool:
    refs = (meta.get("supported_parameters") or {}).get("input_references") or {}
    return (refs.get("max") or 0) >= 1


async def _openrouter_generate_image(rp: ResolvedProvider, prompt: str, image_bytes: bytes, mime_type: str,
                                     aspect_ratio: Optional[str]) -> Tuple[bytes, str, Optional[float]]:
    import base64
    import httpx

    body: dict = {
        "model": rp.model,
        "prompt": prompt,
        "input_references": [{
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode()}"},
        }],
    }
    meta = await _openrouter_image_model(rp.model)
    if meta is None:
        raise AiError(f"«{rp.model}» no es un modelo de imagen de OpenRouter.")
    if not _accepts_reference(meta):
        raise AiError(f"El modelo «{rp.model}» no acepta foto de referencia: elige otro para ilustrar.")
    ratios = ((meta.get("supported_parameters") or {}).get("aspect_ratio") or {}).get("values") or []
    if aspect_ratio and aspect_ratio in ratios:
        body["aspect_ratio"] = aspect_ratio

    data = await post_json(
        f"{_OPENAI_COMPATIBLE['openrouter']}/images",
        headers={"Authorization": f"Bearer {rp.api_key}", "Content-Type": "application/json"},
        # Bajo los 180 s del proxy de Next (next.config.ts) y de nginx: si el modelo se
        # demora, el backend alcanza a responder "La IA tardó demasiado" en vez de que
        # el proxy corte la conexión (ECONNRESET / socket hang up en el navegador).
        body=body, timeout=150.0, label="OpenRouter", model=rp.model,
    )
    # OpenRouter informa el costo real de la generación.
    cost = (data.get("usage") or {}).get("cost")
    cost = float(cost) if isinstance(cost, (int, float)) else None
    item = (data.get("data") or [{}])[0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"]), item.get("media_type") or "image/png", cost
    if item.get("url"):
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(item["url"])
        if resp.status_code == 200:
            return resp.content, resp.headers.get("content-type", "image/png"), cost
    raise AiError("La IA no devolvió una imagen. Prueba con otra foto o ajusta el prompt.")


async def generate_image(rp: ResolvedProvider, prompt: str, image_bytes: bytes, mime_type: str,
                         aspect_ratio: Optional[str] = None) -> Tuple[bytes, str, float]:
    """(bytes, mime, costo USD): el real si la plataforma lo informa, si no el configurado."""
    if rp.provider == "openrouter":
        data, mime, cost = await _openrouter_generate_image(rp, prompt, image_bytes, mime_type, aspect_ratio)
        return data, mime, cost if cost is not None else rp.cost_per_use
    if rp.provider != "gemini":
        raise AiError("La ilustración con IA solo está disponible con Google Gemini u OpenRouter.")
    data, mime = await gemini.generate_image(prompt, image_bytes, mime_type, aspect_ratio, api_key=rp.api_key, model=rp.model)
    return data, mime, rp.cost_per_use


async def _test_openrouter_image(model: str, api_key: str, meta: dict, started: float) -> Tuple[bool, str, Optional[str]]:
    """Valida la key (GET /key, sin costo) y que el modelo acepte foto de referencia."""
    info = await get_json(f"{_OPENAI_COMPATIBLE['openrouter']}/key",
                          headers={"Authorization": f"Bearer {api_key}"}, timeout=15.0,
                          label="OpenRouter", model=model)
    ms = int((time.monotonic() - started) * 1000)
    if not _accepts_reference(meta):
        return False, (f"La key es válida, pero «{model}» no acepta foto de referencia: "
                       "no sirve para ilustrar desde la foto de la mascota."), None
    remaining = (info.get("data") or {}).get("limit_remaining")
    credit = f" · saldo restante: {remaining:.2f} USD" if isinstance(remaining, (int, float)) else ""
    return True, f"Conexión OK ({ms} ms) · modelo de imagen con foto de referencia{credit}.", None


async def test_connection(provider: str, model: str, api_key: str) -> Tuple[bool, str, Optional[str]]:
    """(ok, mensaje, detalle crudo del proveedor). Usa una solicitud mínima.

    Para modelos de imagen solo se verifica que la key sea válida y vea el
    modelo (generar una imagen de prueba tiene costo), por lo que el saldo de
    Gemini se verifica recién al generar.
    """
    started = time.monotonic()
    try:
        if provider == "gemini" and "image" in model.lower():
            await get_json(f"https://generativelanguage.googleapis.com/v1beta/models/{model}",
                           headers={"x-goog-api-key": api_key}, timeout=15.0, label="Gemini", model=model)
            ms = int((time.monotonic() - started) * 1000)
            return True, f"Conexión OK: la key tiene acceso al modelo ({ms} ms). El saldo se verifica al generar.", None
        if provider == "openrouter":
            meta = await _openrouter_image_model(model)
            if meta is not None:
                return await _test_openrouter_image(model, api_key, meta, started)
        text = await _request_text(provider, model, api_key, "Responde únicamente con la palabra: OK",
                                   None, 0.0, 256 if provider in ("gemini", "openai") else 16)
    except AiError as e:
        return False, str(e), e.detail
    ms = int((time.monotonic() - started) * 1000)
    reply = f" · respondió «{text[:40]}»" if text else ""
    return True, f"Conexión OK ({ms} ms){reply}", None
