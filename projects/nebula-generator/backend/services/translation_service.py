from deep_translator import GoogleTranslator

class TranslationService:
    @staticmethod
    def translate_to_english(text: str) -> str:
        """
        Traduce el texto de entrada al inglés para mejorar la interpretación de la IA.
        Soporta detección automática del idioma de origen.
        """
        try:
            if not text or len(text.strip()) == 0:
                return text
                
            translator = GoogleTranslator(source='auto', target='en')
            translated = translator.translate(text)
            return translated
        except Exception as e:
            print(f"Error en traducción: {str(e)}")
            # En caso de error, devolvemos el original para no bloquear la generación
            return text
