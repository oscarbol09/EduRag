import requests
from typing import Optional
from settings import settings

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324:free"


class LLMClient:
    """
    Cliente unificado para OpenRouter.
    Todos los modelos se acceden vía la API compatible con OpenAI de OpenRouter.
    """

    def generate(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float = 0.5,
        api_key: Optional[str] = None,
        model_id: Optional[str] = None,
    ) -> str:
        """
        Genera una respuesta usando OpenRouter.
        
        Args:
            system_prompt: Instrucción de sistema para el LLM.
            context: Texto de los documentos del chatbot.
            user_message: Mensaje del estudiante.
            temperature: Temperatura de generación (0.0–1.0).
            api_key: API key de OpenRouter del docente (BYOK).
                     Si None, se usa la key del admin desde las variables de entorno.
            model_id: ID del modelo de OpenRouter (ej. "deepseek/deepseek-chat-v3-0324:free").
                      Si None, se usa el modelo por defecto.
        
        Returns:
            Texto de la respuesta generada.
        
        Raises:
            RuntimeError: Si la API devuelve un error o la respuesta está vacía.
        """
        effective_key = (api_key or "").strip() or settings.OPENROUTER_API_KEY
        effective_model = (model_id or "").strip() or DEFAULT_MODEL

        if not effective_key:
            raise RuntimeError(
                "No hay API Key de OpenRouter configurada. "
                "El docente debe agregar su propia key en Configuración."
            )

        messages = [
            {
                "role": "system",
                "content": f"{system_prompt}\n\nContexto del documento:\n{context}",
            },
            {
                "role": "user",
                "content": user_message,
            },
        ]

        headers = {
            "Authorization": f"Bearer {effective_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://edu-rag-red.vercel.app",
            "X-Title": "EduRAG Platform",
        }

        payload = {
            "model": effective_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048,
        }

        try:
            response = requests.post(
                OPENROUTER_API_URL,
                json=payload,
                headers=headers,
                timeout=60,
            )

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

        except requests.exceptions.Timeout:
            raise RuntimeError("Tiempo de espera agotado al conectar con OpenRouter. Intenta de nuevo.")
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Error de red al conectar con OpenRouter: {str(e)}")


def get_llm_client() -> LLMClient:
    return LLMClient()
