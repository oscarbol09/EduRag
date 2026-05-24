import google.generativeai as genai
from typing import Optional
from settings import settings

genai.configure(api_key=settings.GOOGLE_API_KEY)


class LLMClient:
    def __init__(self, provider: str = "gemini"):
        self.provider = provider

    def generate(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float = 0.5,
        api_key: Optional[str] = None
    ) -> str:
        if self.provider == "gemini":
            if api_key and api_key.strip() != "":
                return self._generate_gemini_rest(system_prompt, context, user_message, temperature, api_key)
            return self._generate_gemini(system_prompt, context, user_message, temperature)
        elif self.provider == "claude":
            return self._generate_claude(system_prompt, context, user_message, temperature, api_key)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    def _generate_gemini_rest(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float,
        api_key: str
    ) -> str:
        import requests
        
        full_prompt = f"""{system_prompt}

Contexto del documento:
{context}

--- 

Pregunta del usuario: {user_message}

Respuesta:"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{"text": full_prompt}]
            }],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 2048
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            if response.status_code != 200:
                try:
                    error_detail = response.json().get("error", {}).get("message", "Error desconocido")
                except Exception:
                    error_detail = response.text
                raise RuntimeError(f"Error de API Gemini (BYOK): {error_detail}")
                
            result = response.json()
            candidates = result.get("candidates", [])
            if not candidates:
                raise RuntimeError("La API de Gemini no devolvió candidatos de respuesta.")
                
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if not parts:
                raise RuntimeError("La respuesta de Gemini no contiene partes de texto.")
                
            return parts[0].get("text", "")
            
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Error de red al conectar con Gemini: {str(e)}")

    def _generate_gemini(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float
    ) -> str:
        full_prompt = f"""{system_prompt}

Contexto del documento:
{context}

--- 

Pregunta del usuario: {user_message}

Respuesta:"""

        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(
            full_prompt,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": 2048
            }
        )
        return response.text

    def _generate_claude(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float,
        api_key: Optional[str] = None
    ) -> str:
        raise NotImplementedError("Claude client not yet implemented")


def get_llm_client(provider: str = "gemini") -> LLMClient:
    return LLMClient(provider=provider)
