from urllib.parse import parse_qsl
import json

class WebAppAuthData(BaseModel):
    init_data: str

def verify_webapp_data(init_data: str):
    if not BOT_TOKEN:
         raise HTTPException(status_code=500, detail="Server configuration error: TELEGRAM_TOKEN not set")

    try:
        parsed_data = dict(parse_qsl(init_data))
    except ValueError:
         raise HTTPException(status_code=400, detail="Invalid init_data format")
    
    if "hash" not in parsed_data:
        raise HTTPException(status_code=400, detail="Missing hash in init_data")

    hash_received = parsed_data.pop("hash")
    
    # Sort keys alphabetically
    data_check_arr = []
    for k in sorted(parsed_data.keys()):
        data_check_arr.append(f"{k}={parsed_data[k]}")
    
    data_check_string = "\n".join(data_check_arr)
    
    # HMAC-SHA256 signature
    secret_key = hmac.new("WebAppData".encode(), BOT_TOKEN.encode(), hashlib.sha256).digest()
    hash_check = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    if hash_check != hash_received:
        raise HTTPException(status_code=403, detail="Invalid WebApp hash")
        
    # Check auth_date
    if "auth_date" in parsed_data:
        if time.time() - int(parsed_data["auth_date"]) > 86400:
             raise HTTPException(status_code=400, detail="WebApp auth data is outdated")
    
    return json.loads(parsed_data["user"])

@router.post("/webapp")
async def webapp_login(data: WebAppAuthData):
    """
    Verifica los datos de initData de la WebApp y hace login automático.
    """
    user_info = verify_webapp_data(data.init_data)
    
    telegram_id = user_info['id']
    username = user_info.get('username')
    first_name = user_info.get('first_name')
    photo_url = user_info.get('photo_url') # Note: user object in initData might not have photo_url depending on Telegram version
    
    # Reuse the same logic as widget login (find/create user, check age/blacklist)
    # ... (Refactor common logic or copy-paste for now to keep it safe)
    
    user_role = "unknown"
    user_data = None
    
    # 1. Models
    try:
        model = db.client.table("models").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
        if model.data:
            user_role = "model"
            user_data = model.data
            if user_data.get('status') == 'rejected':
                 raise HTTPException(status_code=403, detail="Tu cuenta de modelo ha sido rechazada.")
    except Exception as e:
        print(f"Error checking models: {e}")

    # 2. Clients
    if not user_data:
        try:
            client = db.client.table("clients").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
            if client.data:
                user_role = "client"
                user_data = client.data
                if user_data.get('is_blacklisted'):
                    raise HTTPException(status_code=403, detail="Acceso denegado.")
            else:
                user_role = "client"
                new_client = {
                    "telegram_id": telegram_id,
                    "username": username,
                    "avatar_url": photo_url
                }
                try:
                    res = db.client.table("clients").insert(new_client).execute()
                    if res.data:
                        user_data = res.data[0]
                    else:
                        raise HTTPException(status_code=500, detail="Error creating user")
                except Exception as e:
                     raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    # Age check (reuse)
    birth_date_str = user_data.get('birth_date')
    if birth_date_str:
        try:
            birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
            today = date.today()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            if age < 18:
                raise HTTPException(status_code=403, detail="Debes ser mayor de edad.")
        except:
            pass

    # Update login
    try:
        table = "models" if user_role == "model" else "clients"
        db.client.table(table).update({"last_login_at": datetime.now().isoformat()}).eq("id", user_data['id']).execute()
    except:
        pass

    token_data = {
        "sub": str(telegram_id),
        "role": user_role,
        "user_id": user_data['id'],
        "username": user_data.get('username'),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
        "role": user_role
    }
