from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from src.services.database import db
from src.api.dependencies import get_current_user, TelegramUser
from datetime import datetime, timedelta

router = APIRouter()

# --- Schemas ---
class ViewRecord(BaseModel):
    model_id: str

# --- Routes ---

@router.post("/view")
async def record_view(data: ViewRecord, request: Request, user: Optional[TelegramUser] = Depends(get_current_user)):
    """Records a profile view."""
    try:
        # 1. Get client UUID if user is authenticated as client
        client_id = None
        if user and user.role == 'client':
             res = db.client.table("clients").select("id").eq("telegram_id", user.id).maybe_single().execute()
             if res.data:
                 client_id = res.data['id']
        
        # 2. Record the view
        db.client.table("profile_views").insert({
            "model_id": data.model_id,
            "visitor_id": client_id,
            "viewer_ip": request.client.host
        }).execute()
        
        return {"status": "recorded"}
    except Exception as e:
        print(f"[Analytics] Error recording view: {e}")
        # We don't want to crash the frontend if tracking fails
        return {"status": "error", "detail": str(e)}

@router.get("/model/summary")
async def get_model_summary(user: TelegramUser = Depends(get_current_user)):
    """Returns summary stats for the logged-in model."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Solo para modelos")
    
    try:
        # 1. Get model UUID
        model_res = db.client.table("models").select("id, credits_balance").eq("telegram_id", user.id).single().execute()
        model_id = model_res.data['id']
        credits = model_res.data.get('credits_balance', 0)
        
        # 2. Get total views
        views_res = db.client.table("profile_views") \
            .select("id", count="exact") \
            .eq("model_id", model_id) \
            .execute()
        total_views = views_res.count if views_res.count is not None else 0
        
        # 3. Get total sales (completed orders)
        sales_res = db.client.table("orders") \
            .select("amount", count="exact") \
            .eq("model_id", model_id) \
            .eq("status", "completed") \
            .execute()
        
        total_sales_count = sales_res.count if sales_res.count is not None else 0
        total_revenue = sum([o['amount'] for o in sales_res.data]) if sales_res.data else 0
        
        # 4. Calculate Conversion Rate
        conversion_rate = (total_sales_count / total_views * 100) if total_views > 0 else 0
        
        return {
            "visitors": total_views,
            "sales_count": total_sales_count,
            "revenue": total_revenue,
            "credits": credits,
            "conversion_rate": round(conversion_rate, 2)
        }
    except Exception as e:
        print(f"[Analytics] Error fetching summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/model/exposure")
async def get_model_exposure(user: TelegramUser = Depends(get_current_user)):
    """Returns views per day for the last 7 days."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Solo para modelos")
    
    try:
        model_res = db.client.table("models").select("id").eq("telegram_id", user.id).single().execute()
        model_id = model_res.data['id']
        
        # Calculate daily counts for the last 7 days
        # In a real high-traffic app, we'd use a grouped query, 
        # but for now let's do a simple count per day or a clever range query.
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        
        views_res = db.client.table("profile_views") \
            .select("viewed_at") \
            .eq("model_id", model_id) \
            .gte("viewed_at", seven_days_ago) \
            .execute()
        
        # Group by day in Python for simplicity
        days = {}
        # Pre-fill last 7 days with 0
        for i in range(7):
            d = (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d')
            days[d] = 0
            
        for v in views_res.data:
            d = v['viewed_at'].split('T')[0]
            if d in days:
                days[d] += 1
                
        # Convert to list of points (sorted by date)
        sorted_days = sorted(days.items())
        return [count for date, count in sorted_days]
        
    except Exception as e:
        print(f"[Analytics] Error fetching exposure: {e}")
        return [0, 0, 0, 0, 0, 0, 0]
