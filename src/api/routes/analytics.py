from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from src.services.database import db
from src.api.dependencies import get_current_user, get_current_user_optional, TelegramUser
from datetime import datetime, timedelta

router = APIRouter()

# --- Schemas ---
class ViewRecord(BaseModel):
    model_id: str

# --- Routes ---

@router.post("/view")
async def record_view(data: ViewRecord, request: Request, user: Optional[TelegramUser] = Depends(get_current_user_optional)):
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
async def get_model_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    user: TelegramUser = Depends(get_current_user)
):
    """Returns summary stats for the logged-in model with time filters."""
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
            
            # 3. Get total sales (released orders)
        try:
            sales_res = db.client.table("escrow_orders") \
                .select("amount") \
                .eq("model_id", model_id) \
                .eq("status", "RELEASED") \
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
        
        # 4. Period Filtering (Month/Year)
        period_filter_at = None
        if month and year:
            import calendar
            _, last_day = calendar.monthrange(year, month)
            start_date = datetime(year, month, 1).isoformat()
            end_date = datetime(year, month, last_day, 23, 59, 59).isoformat()
            period_title = f"{month}/{year}"
        else:
            # Default: current week logic
            now = datetime.utcnow()
            start_date = (now - timedelta(days=7)).isoformat()
            end_date = now.isoformat()
            period_title = "Esta semana"

        # Current Period Views
        try:
            curr_views_res = db.client.table("profile_views").select("id", count="exact") \
                .eq("model_id", model_id) \
                .gte("viewed_at", start_date) \
                .lte("viewed_at", end_date) \
                .execute()
            curr_period_views = curr_views_res.count or 0
        except:
            curr_period_views = 0

        # Current Period Sales
        try:
            curr_sales_res = db.client.table("escrow_orders").select("amount") \
                .eq("model_id", model_id) \
                .eq("status", "RELEASED") \
                .gte("created_at", start_date) \
                .lte("created_at", end_date) \
                .execute()
            curr_period_sales_count = len(curr_sales_res.data) if curr_sales_res.data else 0
            curr_period_revenue = sum([safe_float(o['amount']) for o in curr_sales_res.data]) if curr_sales_res.data else 0.0
        except:
            curr_period_sales_count = 0
            curr_period_revenue = 0.0

        # 5. Fetch Wallet Balance
        wallet_balance = 0.0
        try:
            wallet_res = db.client.table("wallets").select("balance").eq("user_id", model_id).maybe_single().execute()
            if wallet_res.data:
                wallet_balance = float(wallet_res.data.get('balance', 0))
        except:
            pass

        # 6. Calculate Conversion Rate for period
        conversion_rate = (curr_period_sales_count / curr_period_views * 100) if curr_period_views > 0 else 0
        
        return {
            "model_name": artistic_name,
            "period_title": period_title,
            "visitors": curr_period_views,
            "sales_count": curr_period_sales_count,
            "revenue": round(curr_period_revenue, 2),
            "wallet_balance": round(wallet_balance, 2),
            "credits": credits,
            "conversion_rate": round(conversion_rate, 2),
            "total_visitors_all_time": total_views,
            "total_revenue_all_time": round(total_revenue, 2)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Analytics] UNEXPECTED FATAL ERROR for {user.id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno inesperado: {str(e)}")


@router.get("/model/exposure")
async def get_model_exposure(
    month: Optional[int] = None,
    year: Optional[int] = None,
    user: TelegramUser = Depends(get_current_user)
):
    """Returns views per day for the last 7 days or a full month."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Solo para modelos")
    
    try:
        model_res = db.client.table("models").select("id").eq("telegram_id", user.id).single().execute()
        model_id = model_res.data['id']
        
        views_data = []
        revenue_data = []

        if month and year:
            import calendar
            _, last_day = calendar.monthrange(year, month)
            start_date = datetime(year, month, 1).isoformat()
            end_date = datetime(year, month, last_day, 23, 59, 59).isoformat()
            
            # Pre-fill month
            days_views = {}
            days_revenue = {}
            for i in range(1, last_day + 1):
                d = f"{year}-{month:02d}-{i:02d}"
                days_views[d] = 0
                days_revenue[d] = 0.0
            
            # Fetch views
            views_res = db.client.table("profile_views") \
                .select("viewed_at") \
                .eq("model_id", model_id) \
                .gte("viewed_at", start_date) \
                .lte("viewed_at", end_date) \
                .execute()
            
            # Fetch revenue
            orders_res = db.client.table("escrow_orders") \
                .select("amount, created_at") \
                .eq("model_id", model_id) \
                .eq("status", "RELEASED") \
                .gte("created_at", start_date) \
                .lte("created_at", end_date) \
                .execute()
        else:
            # Last 7 days
            seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            days_views = {}
            days_revenue = {}
            for i in range(7):
                d = (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d')
                days_views[d] = 0
                days_revenue[d] = 0.0
                
            views_res = db.client.table("profile_views") \
                .select("viewed_at") \
                .eq("model_id", model_id) \
                .gte("viewed_at", seven_days_ago) \
                .execute()

            orders_res = db.client.table("escrow_orders") \
                .select("amount, created_at") \
                .eq("model_id", model_id) \
                .eq("status", "RELEASED") \
                .gte("created_at", seven_days_ago) \
                .execute()
        
        for v in views_res.data:
            d = v['viewed_at'].split('T')[0]
            if d in days_views:
                days_views[d] += 1

        for o in orders_res.data:
            d = o['created_at'].split('T')[0]
            if d in days_revenue:
                days_revenue[d] += safe_float(o['amount'])
                
        sorted_views = sorted(days_views.items())
        sorted_revenue = sorted(days_revenue.items())

        return {
            "views": [count for date, count in sorted_views],
            "revenue": [round(amount, 2) for date, amount in sorted_revenue],
            "labels": [date for date, _ in sorted_views]
        }
        
    except Exception as e:
        print(f"[Analytics] Error fetching exposure: {e}")
        return []

@router.get("/model/visitors")
async def get_model_visitors(user: TelegramUser = Depends(get_current_user)):
    """Returns list of recent visitors with country info."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Solo para modelos")
    
    try:
        model_res = db.client.table("models").select("id").eq("telegram_id", user.id).single().execute()
        model_id = model_res.data['id']
        
        # Get recent views with client/visitor info
        # Joining with clients table to get country_code and username
        res = db.client.table("profile_views") \
            .select("id, viewed_at, visitor_id, viewer_ip, clients(username, country_code)") \
            .eq("model_id", model_id) \
            .order("viewed_at", desc=True) \
            .limit(50) \
            .execute()
            
        visitors = []
        for v in res.data:
            client = v.get('clients') or {}
            visitors.append({
                "viewed_at": v['viewed_at'],
                "username": client.get('username') or "Visitante Anónimo",
                "country_code": client.get('country_code'),
                "ip": v['viewer_ip'] if user.role == "admin" else None # IP only for admin security
            })
            
        return visitors
    except Exception as e:
        print(f"[Analytics] Error fetching visitors: {e}")
        return []
