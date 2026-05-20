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
        temperature: float = 0.5
    ) -> str:
        if self.provider == "gemini":
            return self._generate_gemini(system_prompt, context, user_message, temperature)
        elif self.provider == "claude":
            return self._generate_claude(system_prompt, context, user_message, temperature)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

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
        temperature: float
    ) -> str:
        raise NotImplementedError("Claude client not yet implemented")


def get_llm_client(provider: str = "gemini") -> LLMClient:
    return LLMClient(provider=provider)
