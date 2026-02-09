import os
import logging
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class AIAgent:
    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY must be set in .env")
        
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )
        
        # Models & Temperatures
        self.HUNTER_MODEL = "meta-llama/llama-3.3-70b-instruct"
        self.HUNTER_TEMP = 0.2
        
        self.MANAGER_MODEL = "sao10k/l3-euryale-70b"
        self.MANAGER_TEMP = 0.7

    def chat_completion(self, model_type: str, system_prompt: str, user_message: str):
        """Generic chat completion wrapper."""
        try:
            if model_type == "hunter":
                model = self.HUNTER_MODEL
                temp = self.HUNTER_TEMP
            else:
                model = self.MANAGER_MODEL
                temp = self.MANAGER_TEMP
            
            completion = self.client.chat.completions.create(
                model=model,
                temperature=temp,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                # Optional: Add site headers for OpenRouter
                extra_headers={
                    "HTTP-Referer": "https://agencymodelbot.local", 
                    "X-Title": "AgencyBot"
                }
            )
            return completion.choices[0].message.content
        except Exception as e:
            logger.error(f"AI Error ({model_type}): {e}")
            return "Lo siento, tuve un error interno procesando eso."

    @staticmethod
    def split_into_bubbles(text: str, max_chars=300) -> list[str]:
        """Divide el texto en burbujas de chat naturales."""
        if not text:
            return []
            
        # Si es corto, return directo
        if len(text) <= max_chars:
            return [text]

        bubbles = []
        current_bubble = ""
        
        # Split por oraciones (básico)
        sentences = text.replace(". ", ".\n").split("\n")
        
        for sentence in sentences:
            if len(current_bubble) + len(sentence) <= max_chars:
                current_bubble += sentence + " "
            else:
                if current_bubble:
                    bubbles.append(current_bubble.strip())
                current_bubble = sentence + " "
        
        if current_bubble:
            bubbles.append(current_bubble.strip())
            
        return bubbles

# Singleton
ai_agent = AIAgent()
