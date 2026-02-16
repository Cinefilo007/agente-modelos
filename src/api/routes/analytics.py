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
    
    print(f"[Analytics] Fetching summary for Telegram User: {user.id}")
    try:
        # 1. Get model UUID and Credits
        try:
            model_res = db.client.table("models").select("id, artistic_name, credits_balance").eq("telegram_id", user.id).maybe_single().execute()
            if not model_res.data:
                print(f"[Analytics] Model NOT FOUND in DB for Telegram ID: {user.id}")
                raise HTTPException(status_code=404, detail="Perfil de modelo no encontrado en el sistema.")
            
            model_id = model_res.data['id']
            artistic_name = model_res.data.get('artistic_name', 'Modelo')
            credits = model_res.data.get('credits_balance', 0) or 0
            print(f"[Analytics] Found model: {model_id} ({artistic_name}), Credits: {credits}")
        except Exception as e:
            print(f"[Analytics] CRITICAL ERROR querying 'models' table: {e}")
            raise HTTPException(status_code=500, detail=f"Error al consultar perfil del modelo: {str(e)}")

        # 2. Get total views (Visitors)
        try:
            views_res = db.client.table("profile_views") \
                .select("id", count="exact") \
                .eq("model_id", model_id) \
                .execute()
            total_views = views_res.count if views_res.count is not None else 0
            print(f"[Analytics] Total Views (DB Count): {total_views}")
        except Exception as e:
            print(f"[Analytics] WARNING error querying 'profile_views', defaulting to 0: {e}")
            total_views = 0
            
        # 3. Get total sales (completed orders)
        try:
            sales_res = db.client.table("escrow_orders") \
                .select("amount") \
                .eq("model_id", model_id) \
                .eq("status", "completed") \
                .execute()
            
            total_sales_count = len(sales_res.data) if sales_res.data else 0
            
            # Use a safe converter for Decimal/Numeric to float
            def safe_float(val):
                try: return float(val) if val is not None else 0.0
                except: return 0.0
                
            total_revenue = sum([safe_float(o['amount']) for o in sales_res.data]) if sales_res.data else 0.0
            print(f"[Analytics] Sales count: {total_sales_count}, Revenue: {total_revenue}")
        except Exception as e:
            print(f"[Analytics] WARNING error querying 'escrow_orders', defaulting to 0: {e}")
            total_sales_count = 0
            total_revenue = 0.0
        
        # 4. Calculate Trends (Last 7 days vs Previous 7 days)
        try:
            now = datetime.utcnow()
            last_7_days = (now - timedelta(days=7)).isoformat()
            prev_7_days = (now - timedelta(days=14)).isoformat()

            # Current Period Views
            curr_views_res = db.client.table("profile_views").select("id", count="exact") \
                .eq("model_id", model_id).gte("viewed_at", last_7_days).execute()
            curr_views = curr_views_res.count or 0

            # Previous Period Views
            prev_views_res = db.client.table("profile_views").select("id", count="exact") \
                .eq("model_id", model_id).gte("viewed_at", prev_7_days).lt("viewed_at", last_7_days).execute()
            prev_views = prev_views_res.count or 0

            # Growth calc: ((curr - prev) / max(prev, 1)) * 100
            visitors_growth = round(((curr_views - prev_views) / prev_views * 100), 1) if prev_views > 0 else (100.0 if curr_views > 0 else 0.0)

            # Current Period Sales
            curr_sales_res = db.client.table("escrow_orders").select("id", count="exact") \
                .eq("model_id", model_id).eq("status", "completed").gte("created_at", last_7_days).execute()
            curr_sales = curr_sales_res.count or 0

            # Previous Period Sales
            prev_sales_res = db.client.table("escrow_orders").select("id", count="exact") \
                .eq("model_id", model_id).eq("status", "completed").gte("created_at", prev_7_days).lt("created_at", last_7_days).execute()
            prev_sales = prev_sales_res.count or 0

            sales_growth = round(((curr_sales - prev_sales) / prev_sales * 100), 1) if prev_sales > 0 else (100.0 if curr_sales > 0 else 0.0)
            
            print(f"[Analytics] Visitors Growth: {visitors_growth}%, Sales Growth: {sales_growth}%")
        except Exception as e:
            print(f"[Analytics] Error calculating trends: {e}")
            visitors_growth = 0.0
            sales_growth = 0.0

        # 5. Calculate Conversion Rate
        # Conversion = (Sales / Views) * 100
        conversion_rate = (total_sales_count / total_views * 100) if total_views > 0 else 0
        
        return {
            "model_name": artistic_name,
            "visitors": total_views,
            "sales_count": total_sales_count,
            "revenue": round(total_revenue, 2),
            "credits": credits,
            "conversion_rate": round(conversion_rate, 2),
            "visitors_growth": visitors_growth,
            "sales_growth": sales_growth
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Analytics] UNEXPECTED FATAL ERROR for {user.id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno inesperado: {str(e)}")


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
