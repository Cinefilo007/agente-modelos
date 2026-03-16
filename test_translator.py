import asyncio
from deep_translator import GoogleTranslator

def test_trans():
    es_text = "playa paradisíaca al atardecer"
    en_text = GoogleTranslator(source='auto', target='en').translate(es_text)
    print(f"Original: {es_text}")
    print(f"Translated: {en_text}")

if __name__ == "__main__":
    test_trans()
