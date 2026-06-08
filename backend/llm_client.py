import json
import httpx
from typing import AsyncIterator, Optional
from settings import settings

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_TIMEOUT = httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=10.0)


def _default_model() -> str:
    """Lee el modelo por defecto desde settings, con fallback defensivo."""
    return settings.DEFAULT_LLM_MODEL or "google/gemma-3-27b-it:free"


class LLMClient:
    """
    Cliente unificado para OpenRouter (asíncrono).

    Implementa dos modos:
    - generate(): respuesta completa (no streaming).
    - generate_stream(): genera tokens incrementalmente vía SSE.

    Ambos usan httpx.AsyncClient para no bloquear el event loop de FastAPI.
    """

    def _build_payload(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float,
        model_id: Optional[str],
        stream: bool,
        history_messages: Optional[list[dict]] = None,
    ) -> tuple[dict, dict]:
        effective_model = (model_id or "").strip() or _default_model()

        messages = [
            {
                "role": "system",
                "content": f"{system_prompt}\n\nContexto del documento:\n{context}",
            }
        ]

        if history_messages:
            for msg in history_messages:
                role = msg.get("role")
                content = msg.get("content")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": user_message})

        headers = {
            "Content-Type": "application/json",
            "HTTP-Referer": "https://edu-rag-red.vercel.app",
            "X-Title": "EduRAG Platform",
        }

        payload = {
            "model": effective_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048,
            "stream": stream,
        }

        return payload, headers

    def _resolve_auth(self, api_key: Optional[str]) -> str:
        effective_key = (api_key or "").strip() or settings.OPENROUTER_API_KEY
        if not effective_key:
            raise RuntimeError(
                "No hay API Key de OpenRouter configurada. "
                "El docente debe agregar su propia key en Configuración."
            )
        return effective_key

    async def generate(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float = 0.5,
        api_key: Optional[str] = None,
        model_id: Optional[str] = None,
        history_messages: Optional[list[dict]] = None,
    ) -> str:
        """Genera una respuesta completa de OpenRouter (no streaming)."""
        effective_key = self._resolve_auth(api_key)
        payload, headers = self._build_payload(
            system_prompt,
            context,
            user_message,
            temperature,
            model_id,
            stream=False,
            history_messages=history_messages,
        )
        headers["Authorization"] = f"Bearer {effective_key}"

        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                response = await client.post(OPENROUTER_API_URL, json=payload, headers=headers)

                if response.status_code != 200:
                    try:
                        error_detail = response.json().get("error", {}).get("message", "Error desconocido")
                    except Exception:
                        error_detail = response.text[:500]
                    raise RuntimeError(f"Error de OpenRouter [{response.status_code}]: {error_detail}")

                result = response.json()
                choices = result.get("choices", [])
                if not choices:
                    raise RuntimeError("OpenRouter no devolvió ninguna respuesta.")

                content = choices[0].get("message", {}).get("content", "")
                if not content:
                    raise RuntimeError("La respuesta de OpenRouter está vacía.")

                return content

        except httpx.TimeoutException:
            raise RuntimeError("Tiempo de espera agotado al conectar con OpenRouter. Intenta de nuevo.")
        except httpx.RequestError as e:
            raise RuntimeError(f"Error de red al conectar con OpenRouter: {str(e)}")

    async def generate_stream(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float = 0.5,
        api_key: Optional[str] = None,
        model_id: Optional[str] = None,
        history_messages: Optional[list[dict]] = None,
    ) -> AsyncIterator[str]:
        """
        Genera la respuesta como un stream de chunks de texto.
        Cada yield es un fragmento incremental del contenido del assistant.
        """
        effective_key = self._resolve_auth(api_key)
        payload, headers = self._build_payload(
            system_prompt,
            context,
            user_message,
            temperature,
            model_id,
            stream=True,
            history_messages=history_messages,
        )
        headers["Authorization"] = f"Bearer {effective_key}"

        try:
            async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                async with client.stream("POST", OPENROUTER_API_URL, json=payload, headers=headers) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        try:
                            error_detail = json.loads(body.decode("utf-8")).get("error", {}).get("message", "Error desconocido")
                        except Exception:
                            error_detail = body.decode("utf-8", errors="replace")[:500]
                        raise RuntimeError(f"Error de OpenRouter [{response.status_code}]: {error_detail}")

                    async for raw_line in response.aiter_lines():
                        if not raw_line:
                            continue
                        line = raw_line.strip()
                        if not line.startswith("data:"):
                            continue
                        data_str = line[len("data:"):].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            obj = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue
                        choices = obj.get("choices") or []
                        if not choices:
                            continue
                        delta = choices[0].get("delta") or {}
                        piece = delta.get("content")
                        if piece:
                            yield piece

        except httpx.TimeoutException:
            raise RuntimeError("Tiempo de espera agotado al conectar con OpenRouter. Intenta de nuevo.")
        except httpx.RequestError as e:
            raise RuntimeError(f"Error de red al conectar con OpenRouter: {str(e)}")


def get_llm_client() -> LLMClient:
    return LLMClient()
