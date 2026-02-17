from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Body
from pydantic import BaseModel
from typing import Optional, Dict, List
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
from src.services.storage import upload_file
import os
from datetime import datetime
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup

router = APIRouter()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
ADMIN_ID = 1123020118 # Hardcoded admin ID

@router.post("/heartbeat")
async def heartbeat(user: TelegramUser = Depends(get_current_user)):
    """Update user's last_seen timestamp."""
    if user.role == "model":
        try:
            now = datetime.utcnow().isoformat()
            db.client.table("models").update({"last_seen": now}).eq("telegram_id", user.id).execute()
            return {"status": "online"}
        except Exception as e:
            print(f"[Heartbeat] Error updating model status: {e}")
            raise HTTPException(status_code=500, detail="Error updating status")
    return {"status": "ok"}

@router.post("/upload-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    type: str = "avatar", # avatar or cover
    user: TelegramUser = Depends(get_current_user)
):
    """Upload functionality for profile images."""
    # Determine bucket based on type
    bucket = "avatars" if type == "avatar" else "covers"
    
    # We might need to ensure these buckets exist in Supabase or use a generic 'profiles' bucket with folders
    # detailed in storage.py. For now let's assume 'avatars' and 'covers' or just 'public'
    # Checking storage.py usage in content.py: upload_file(file, bucket_name="posts")
    # Let's use a single 'profiles' bucket for simplicity if not defined
    bucket_name = "profiles" 
    
    public_url = await upload_file(file, bucket_name=bucket_name, folder=type)
    return {"url": public_url}

@router.post("/apply-model")
async def apply_as_model(
    full_name: str = Body(...),
    country_code: str = Body(...),
    birth_date: str = Body(...),
    bio: str = Body("", embed=True),
    file: UploadFile = File(...),
    user: TelegramUser = Depends(get_current_user)
):
    """
    Endpoint para que un usuario se postule como Creador (Modelo).
    1. Sube la selfie con documento.
    2. Crea/Actualiza registro en 'models' con estado 'verifying'.
    3. Notifica al Admin por Telegram.
    """
    import traceback
    print(f"[Apply Model] Starting application for user {user.id} ({user.username})")
    
    try:
        # 1. Upload Verification Photo
        print(f"[Apply Model] Uploading file: {file.filename}")
        verification_url = await upload_file(file, bucket_name="verifications", folder=f"{user.id}")
        print(f"[Apply Model] File uploaded. URL: {verification_url}")
        
        # 2. Upsert Model Record
        model_data = {
            "telegram_id": user.id,
            "username": user.username or f"user_{user.id}",
            "full_name": full_name,
            "bio_short": bio, # Using bio_short for initial bio
            "birth_date": birth_date,
            "status": "verifying",
            "verification_video_id": verification_url, # Storing photo URL in existing column for now
            "social_links": [{"network": "country", "url": country_code}] # Storing country in social_links or add column? generic 'config_persona' maybe?
            # Let's verify schema. Using 'config_persona' for country temporarily or add to metadata.
        }
        
        print(f"[Apply Model] Upserting DB record: {model_data}")
        # Check if model exists
        existing = db.client.table("models").select("*").eq("telegram_id", user.id).maybe_single().execute()
        
        if existing and existing.data:
            # Update existing
            db.client.table("models").update(model_data).eq("telegram_id", user.id).execute()
            model_id = existing.data['id']
            print(f"[Apply Model] Updated existing model: {model_id}")
        else:
            # Insert new
            res = db.client.table("models").insert(model_data).execute()
            if res.data:
                model_id = res.data[0]['id']
                print(f"[Apply Model] Created new model: {model_id}")
            else:
                print("[Apply Model] Insert returned no data")
                raise HTTPException(status_code=500, detail="Error creating model record")
    
        # 3. Notify Admin
        print(f"[Apply Model] Notifying admin {ADMIN_ID}")
        try:
            bot = Bot(token=TELEGRAM_TOKEN)
            
            caption = (
                f"📝 *Nueva Solicitud de Creador*\n\n"
                f"👤 *Usuario:* @{user.username} (ID: `{user.id}`)\n"
                f"📛 *Nombre Real:* {full_name}\n"
                f"🌍 *País:* {country_code}\n"
                f"🎂 *Fecha Nac:* {birth_date}\n\n"
                f"📸 *Evidencia:* [Ver Foto]({verification_url})"
            )
            
            keyboard = [
                [
                    InlineKeyboardButton("✅ Aprobar", callback_data=f"admin_approve|{user.id}"),
                    InlineKeyboardButton("❌ Rechazar", callback_data=f"admin_reject|{user.id}")
                ]
            ]
            
            try:
                await bot.send_photo(
                    chat_id=ADMIN_ID,
                    photo=verification_url, 
                    caption=caption,
                    parse_mode="Markdown",
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
                print("[Apply Model] Admin notified successfully with photo")
            except Exception as photo_err:
                print(f"[Admin Notify] Photo failed, sending text fallback: {photo_err}")
                await bot.send_message(
                    chat_id=ADMIN_ID,
                    text=caption, # Caption contains the link
                    parse_mode="Markdown",
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
                print("[Apply Model] Admin notified successfully with text fallback")
        except Exception as e:
            print(f"[Admin Notify Error] {e}")
            traceback.print_exc()
            # Don't fail the request if notification fails, but log it.
        
        return {"status": "success", "message": "Solicitud enviada. Te notificaremos cuando seas aprobada."}
    
    except Exception as exc:
        print(f"[Apply Model CRITICAL ERROR] {exc}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(exc)}")

class StartProfileUpdate(BaseModel):
    full_name: Optional[str] = None # Allow updating real name too if needed, or keep it read-only? 
    # User asked for "Nombre artistico visible, nombre real solo admin". 
    # Let's start by adding artistic_name.
    artistic_name: Optional[str] = None
    bio_short: Optional[str] = None
    social_links: Optional[List[Dict[str, str]]] = None # List of {network, url, icon}
    cover_url: Optional[str] = None
    avatar_url: Optional[str] = None
    terms_accepted: Optional[bool] = None
    birth_date: Optional[str] = None
    
    # Bot Config Fields
    prices: Optional[str] = None
    personality: Optional[str] = None
    physical_aspects: Optional[str] = None
    payment_methods: Optional[str] = None
    payout_address: Optional[str] = None

@router.get("/me")
async def get_my_profile(user: TelegramUser = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    if user.role == "client":
        client = db.client.table("clients").select("*").eq("telegram_id", user.id).single().execute()
        if not client.data:
             raise HTTPException(status_code=404, detail="Client profile not found.")
        user_data = client.data
        user_data['role'] = 'client'
        return user_data

    # Default to Model
    model = db.client.table("models").select("*").eq("telegram_id", user.id).single().execute()
    
    if not model.data:
        raise HTTPException(status_code=404, detail="Model profile not found. Please register via the bot first.")
    
    user_data = model.data
    # Fetch stats for 'me'
    try:
        posts_count = db.client.table("posts").select("id", count="exact").eq("model_id", user_data['id']).execute()
        user_data['posts_count'] = posts_count.count if posts_count.count else 0
    except:
        user_data['posts_count'] = 0

    # Map legacy config_ columns to flat fields for frontend
    def extract_text(val):
        if isinstance(val, dict): return val.get('text', '')
        # Handle stringified JSON for text columns if they were wrongly saved
        if isinstance(val, str):
            val_str = val.strip()
            if val_str.startswith('{"text":') and val_str.endswith('}'):
                try:
                    import json
                    return json.loads(val_str).get('text', '')
                except:
                    pass
            return val
        if isinstance(val, list) and len(val) > 0: return str(val[0]) # Fallback
        return str(val) if val is not None else ''

    user_data['prices'] = extract_text(user_data.get('config_prices'))
    user_data['personality'] = extract_text(user_data.get('config_persona'))
    user_data['physical_aspects'] = extract_text(user_data.get('config_physique'))
    user_data['payment_methods'] = extract_text(user_data.get('config_payments'))

    user_data['role'] = 'model'
    return user_data

@router.put("/me")
async def update_my_profile(update_data: StartProfileUpdate, user: TelegramUser = Depends(get_current_user)):
    """Update profile details."""
    table = "models" if user.role == "model" else "clients"
    
    # Check if exists
    profile = db.client.table(table).select("id").eq("telegram_id", user.id).single().execute()
    
    if not profile.data:
        raise HTTPException(status_code=404, detail=f"{user.role.capitalize()} profile not found.")

    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if "social_links" in updates and table == "models":
        # Convert Pydantic model to dict for JSONB
        updates["social_links"] = updates["social_links"]
    
    # Map flat fields to config_ JSONB columns
    if "prices" in updates:
        updates["config_prices"] = {"text": updates.pop("prices")}
    if "personality" in updates:
        updates["config_persona"] = updates.pop("personality") # TEXT column, direct save
    if "physical_aspects" in updates:
        updates["config_physique"] = updates.pop("physical_aspects") # TEXT column, direct save
    if "payment_methods" in updates:
        updates["config_payments"] = {"text": updates.pop("payment_methods")}
    if "payout_address" in updates:
        updates["payout_address"] = updates["payout_address"]
    
    if not updates:
        return {"message": "No changes detected"}

    response = db.client.table(table).update(updates).eq("telegram_id", user.id).execute()
    
    if not response or not response.data:
        # Fallback to fetching the record if update didn't return data (depends on Postgres version/config)
        profile = db.client.table(table).select("*").eq("telegram_id", user.id).single().execute()
        return profile.data

    return response.data[0]

import uuid

@router.get("/{identifier}")
async def get_public_profile(identifier: str):
    """Get a public profile by ID or Username."""
    
    # Determine if identifier is UUID
    is_uuid = False
    try:
        uuid.UUID(identifier)
        is_uuid = True
    except ValueError:
        is_uuid = False
        
    query = db.client.table("models") \
        .select("id, full_name, artistic_name, username, bio_short, avatar_url, cover_url, followers_count, total_likes, reputation_score, social_links")
        
    if is_uuid:
        query = query.eq("id", identifier)
    else:
        # Assume it's a username (add @ if missing? frontend usually sends clean, but let's be safe)
        # DB usernames might store with or without @. Let's assume without or exact match.
        # If DB has '@username', and we send 'username', we might need to adjust.
        # Let's try exact match first.
        query = query.eq("username", identifier)
        
    model = query.single().execute()
        
    if not model.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    user_data = model.data
    model_id = user_data['id'] # Ensure we have the ID for subsequent queries

    # Fetch posts count
    posts_count = db.client.table("posts").select("id", count="exact").eq("model_id", model_id).execute()
    user_data['posts_count'] = posts_count.count if posts_count.count else 0
    
    # Fetch latest posts (limit 9 for grid)
    posts = db.client.table("posts").select("id, media_url, media_type, likes_count").eq("model_id", model_id).order("created_at", desc=True).limit(9).execute()
    user_data['posts'] = posts.data if posts.data else []

    return user_data

@router.get("/models/explore")
async def get_models_for_explore(
    filter: str = "all",
    q: Optional[str] = None,
    user: Optional[TelegramUser] = Depends(get_current_user)
):
    """
    Get list of models for the explore page with filters and search.
    """
    try:
        from datetime import datetime, timedelta
        
        query = db.client.table("models") \
            .select("id, artistic_name, username, avatar_url, last_seen, country, reputation_score, is_verified, created_at") \
            .eq("is_verified", True) \
            .eq("status", "active") \
            .gt("credits_balance", 0) \
            .not_.is_("avatar_url", "null")
            
        # Apply Search Query
        if q:
            # Search by artistic_name or username
            query = query.or_(f"artistic_name.ilike.%{q}%,username.ilike.%{q}%")

        # Apply Filters
        if filter == "new":
            query = query.order("created_at", desc=True)
        elif filter == "top":
            query = query.order("reputation_score", desc=True)
        elif filter == "online":
            five_minutes_ago = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
            query = query.gte("last_seen", five_minutes_ago)
        elif filter == "near":
            if user:
                is_model = user.role == "model"
                table = "models" if is_model else "clients"
                field = "country" if is_model else "country_code"
                
                profile = db.client.table(table).select(field).eq("telegram_id", user.id).maybe_single().execute()
                if profile.data and profile.data.get(field):
                    query = query.eq("country", profile.data.get(field))
                else:
                    return []
            else:
                return []

        response = query.execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching models for explore: {e}")
        return []
