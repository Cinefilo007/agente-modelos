import telegram
from telegram import Bot
import inspect

async def check():
    try:
        from telegram import InputStoryContentPhoto, InputStoryContentVideo
        print(f"Clases encontradas: {InputStoryContentPhoto}, {InputStoryContentVideo}")
        print(f"Firma Photo: {inspect.signature(InputStoryContentPhoto.__init__)}")
        print(f"Firma Video: {inspect.signature(InputStoryContentVideo.__init__)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(check())
