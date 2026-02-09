from n8n_bridge import health_check, get_workflows

def main():
    print("--- Probando conexión con n8n ---")
    if health_check():
        print("✅ Conexión Exitosa")
        
        print("\n--- Listando flujos activos ---")
        workflows = get_workflows(active_only=False)
        if workflows:
            for w in workflows:
                status = "🟢" if w.get("active") else "🔴"
                print(f"{status} [{w.get('id')}] {w.get('name')}")
        else:
            print("No se encontraron flujos o hubo un error al leerlos.")
    else:
        print("❌ Falló la conexión con n8n. Verifica que n8n esté corriendo y la API Key sea correcta.")

if __name__ == "__main__":
    main()
