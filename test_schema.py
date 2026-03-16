import fal_client
import json

def fetch_schema():
    print("Testing openapi...")
    import requests
    res = requests.get("https://fal.run/fal-ai/image-editing/openapi.json")
    if res.status_code == 200:
        schema = res.json()
        with open("schema.json", "w") as f:
            json.dump(schema, f, indent=2)
        print("Schema saved!")
    else:
        print("Failed to get openapi:", res.status_code)

if __name__ == "__main__":
    fetch_schema()
