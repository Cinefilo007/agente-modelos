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
        self.HUNTER_MODEL = "google/gemini-2.5-flash"
        self.HUNTER_TEMP = 0.7
        
        self.MANAGER_MODEL = "sao10k/l3-euryale-70b"
        self.MANAGER_TEMP = 0.7

    def chat_completion(self, model_type: str, system_prompt: str, user_message: str, history: list = None, temperature: float = None):
        """Generic chat completion wrapper."""
        try:
            if model_type == "hunter":
                model = self.HUNTER_MODEL
                temp = self.HUNTER_TEMP
            elif model_type == "manager":
                model = self.MANAGER_MODEL
                temp = self.MANAGER_TEMP
            else:
                model = self.MANAGER_MODEL
                temp = self.MANAGER_TEMP
                
            if temperature is not None:
                temp = temperature
            
            messages = [{"role": "system", "content": system_prompt}]
            
            if history:
                messages.extend(history)
                
            messages.append({"role": "user", "content": user_message})
            
            completion = self.client.chat.completions.create(
                model=model,
                temperature=temp,
                messages=messages,
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
    def split_into_bubbles(text: str, max_chars=180) -> list[str]:
        """Divide el texto en burbujas de chat naturales (estilo WhatsApp)."""
        if not text:
            return []
            
        # Limpiar tags de intención antes de fragmentar
        clean_text = text.replace("[NOTIFY]", "").replace("[GHOST]", "").strip()

        if len(clean_text) <= max_chars:
            return [clean_text]

        bubbles = []
        current_bubble = ""
        
        # Split por oraciones para que sea natural (solo puntos)
        parts = clean_text.replace(". ", ".|").split("|")
        
        for part in parts:
            if len(current_bubble) + len(part) <= max_chars:
                current_bubble += part + " "
            else:
                if current_bubble:
                    bubbles.append(current_bubble.strip())
                current_bubble = part + " "
        
        if current_bubble:
            bubbles.append(current_bubble.strip())
            
        return [b for b in bubbles if b.strip()]

# Singleton
ai_agent = AIAgent()
