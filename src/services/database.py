import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Global Logger
logger = logging.getLogger(__name__)

class Database:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._client = None
        return cls._instance

    @property
    def client(self) -> Client:
        if self._client is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_KEY")
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
            self._client = create_client(url, key)
            logger.info("Supabase Client Initialized")
        return self._client

    @property
    def service_client(self) -> Client:
        """
        Retorna un cliente con Service Role (Admin) si está disponible.
        Útil para operaciones de storage o administrativas que saltan RLS.
        """
        if getattr(self, '_service_client', None) is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if url and key:
                self._service_client = create_client(url, key)
                logger.info("Supabase Service Client Initialized")
            else:
                logger.warning("SUPABASE_SERVICE_ROLE_KEY not found. Fallback to regular client (RLS checks apply).")
                self._service_client = self.client
        return self._service_client

    def get_model(self, telegram_id: int):
        """Busca una modelo por su Telegram ID."""
        try:
            response = self.client.table("models").select("*").eq("telegram_id", telegram_id).limit(1).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting model {telegram_id}: {e}")
            return None

    def get_model_by_uuid(self, model_uuid: str):
        """Busca una modelo por su UUID."""
        try:
            response = self.client.table("models").select("*").eq("id", model_uuid).limit(1).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting model by UUID {model_uuid}: {e}")
            return None

    def create_model(self, telegram_id: int, username: str, full_name: str):
        """Crea una nueva modelo en estado Prospect."""
        try:
            data = {
                "telegram_id": telegram_id,
                "username": username,
                "full_name": full_name,
                "status": "prospect"
            }
            response = self.client.table("models").insert(data).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error creating model {telegram_id}: {e}")
            return None

    def update_model(self, telegram_id: int, updates: dict):
        """Actualiza campos de la modelo."""
        try:
            response = self.client.table("models").update(updates).eq("telegram_id", telegram_id).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error updating model {telegram_id}: {e}")
            return None

    def update_model_by_uuid(self, model_uuid: str, updates: dict):
        """Actualiza campos de la modelo por UUID."""
        try:
            response = self.client.table("models").update(updates).eq("id", model_uuid).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error updating model UUID {model_uuid}: {e}")
            return None

    def log_message(self, model_id: str, sender_type: str, content: str, intent: str = None, metadata: dict = None):
        """Guarda un mensaje en el historial."""
        try:
            data = {
                "model_id": model_id,
                "sender_type": sender_type,
                "content": content,
                "intent": intent,
                "metadata": metadata or {}
            }
            
            # Si relation_id viene en metadata, sacarlo a nivel superior para la DB si la columna existe
            if metadata and "relation_id" in metadata:
                data["relation_id"] = metadata["relation_id"]
                
            self.client.table("messages").insert(data).execute()
        except Exception as e:
            logger.error(f"Error logging message for model {model_id}: {e}")

    def get_chat_history(self, model_id: str, limit: int = 10):
        """Obtiene el historial reciente de chat."""
        try:
            response = self.client.table("messages") \
                .select("sender_type, content, intent") \
                .eq("model_id", model_id) \
                .order("created_at", desc=True) \
                .limit(limit) \
                .execute()
            
            # Retornar en orden cronológico (antiguo -> nuevo)
            return response.data[::-1] if response.data else []
        except Exception as e:
            logger.error(f"Error getting history for model {model_id}: {e}")
            return []

    def get_pending_models(self):
        """Obtiene todos los modelos con status 'pending'."""
        try:
            response = self.client.table("models") \
                .select("*") \
                .eq("status", "pending") \
                .order("created_at", desc=False) \
                .execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting pending models: {e}")
            return []

    def get_all_models_for_broadcast(self):
        """Obtiene todas las modelos que han interactuado con el bot (para difusión masiva).
        Incluye: prospect, pending, active (excluye rejected).
        """
        try:
            response = self.client.table("models") \
                .select("telegram_id, username, full_name, status") \
                .in_("status", ["prospect", "pending", "active"]) \
                .order("created_at", desc=False) \
                .execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting models for broadcast: {e}")
            return []

    def get_active_credit_packages(self):
        """Obtiene paquetes de créditos activos."""
        try:
            response = self.client.table("credit_packages").select("*").eq("is_active", True).order("price").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error getting packages: {e}")
            return []

    # --- CLIENTS ---
    def get_client(self, telegram_id: int):
        """Busca un cliente por su Telegram ID."""
        try:
            response = self.client.table("clients").select("*").eq("telegram_id", telegram_id).limit(1).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting client {telegram_id}: {e}")
            return None

    def create_client_user(self, telegram_id: int, username: str, country_code: str = None):
        """Crea un nuevo cliente."""
        try:
            data = {
                "telegram_id": telegram_id,
                "username": username,
                "country_code": country_code,
                "wallet_balance": 0.00
            }
            response = self.client.table("clients").insert(data).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error creating client {telegram_id}: {e}")
            return None

    def update_client_wallet(self, client_id: str, amount: float):
        """Actualiza el saldo de la wallet de un cliente."""
        try:
            # Primero obtener saldo actual
            client = self.client.table("clients").select("wallet_balance").eq("id", client_id).single().execute()
            current_balance = float(client.data['wallet_balance'])
            new_balance = current_balance + amount
            
            response = self.client.table("clients").update({"wallet_balance": new_balance}).eq("id", client_id).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error updating wallet for client {client_id}: {e}")
            return None

    # --- P2P ORDERS ---
    def create_order(self, client_id: str, model_id: str, amount: float, description: str):
        """Crea una nueva orden P2P."""
        try:
            data = {
                "client_id": client_id,
                "model_id": model_id,
                "amount": amount,
                "description": description,
                "status": "pending"
            }
            response = self.client.table("orders").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating order: {e}")
            return None

    def update_order_status(self, order_id: str, status: str):
        """Actualiza el estado de una orden."""
        try:
            response = self.client.table("orders").update({"status": status}).eq("id", order_id).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error updating order {order_id}: {e}")
            return None

    def get_user_orders(self, user_id: str, role: str = "client"):
        """Obtiene las órdenes de un usuario (cliente o modelo)."""
        try:
            column = "client_id" if role == "client" else "model_id"
            response = self.client.table("orders").select("*, models(username, avatar_url), clients(username)").eq(column, user_id).order("created_at", desc=True).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error getting orders for {user_id}: {e}")
            return []

    # --- DISPUTES ---
    def create_dispute(self, order_id: str, client_evidence: str):
        """Crea una disputa para una orden."""
        try:
            # Actualizar orden a disputed
            self.update_order_status(order_id, "disputed")
            
            data = {
                "order_id": order_id,
                "client_evidence": client_evidence,
                "resolution": "pending"
            }
            response = self.client.table("disputes").insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating dispute for order {order_id}: {e}")
            return None

    def resolve_dispute(self, dispute_id: str, resolution: str, admin_notes: str):
        """Resuelve una disputa."""
        try:
            updates = {
                "resolution": resolution,
                "admin_notes": admin_notes
            }
            response = self.client.table("disputes").update(updates).eq("id", dispute_id).execute()
            
            # Si se resuelve, actualizar estado de la orden
            if response.data:
                dispute = response.data[0]
                order_status = "released" if resolution == "model_win" else "refunded"
                self.update_order_status(dispute['order_id'], order_status)
                
            return response.data
        except Exception as e:
            logger.error(f"Error resolving dispute {dispute_id}: {e}")
            return None

    def get_active_disputes(self):
        """Obtiene todas las disputas pendientes."""
        try:
            # Join con orders para ver detalles
            response = self.client.table("disputes").select("*, orders(*, clients(username), models(username))").eq("resolution", "pending").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error getting disputes: {e}")
            return []

    # --- BLACKLIST ---
    def add_to_blacklist(self, telegram_id: int, username: str, reason: str, severity: str, added_by: str = None):
        """Agrega un usuario a la lista negra global."""
        try:
            data = {
                "telegram_id": telegram_id,
                "username": username,
                "reason": reason,
                "severity": severity,
                "added_by": added_by
            }
            response = self.client.table("global_blacklist").insert(data).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error adding to blacklist: {e}")
            return None

    def get_blacklist(self):
        """Obtiene la lista negra global."""
        try:
            response = self.client.table("global_blacklist").select("*").order("created_at", desc=True).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error getting blacklist: {e}")
            return []
            
    def remove_from_blacklist(self, record_id: str):
        """Elimina un registro de la lista negra."""
        try:
            self.client.table("global_blacklist").delete().eq("id", record_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error removing from blacklist {record_id}: {e}")
            return False

    # --- REVIEWS ---
    def add_client_review(self, client_id: str, model_id: str, rating: int, comment: str, tags: str):
        """Agrega una review a un cliente."""
        try:
            data = {
                "client_id": client_id,
                "model_id": model_id,
                "rating": rating,
                "comment": comment,
                "tags": tags
            }
            response = self.client.table("client_reviews").insert(data).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error adding review: {e}")
            return None

    def get_client_reviews(self, client_id: str):
        """Obtiene las reviews de un cliente."""
        try:
            response = self.client.table("client_reviews").select("*, models(username, avatar_url)").eq("client_id", client_id).order("created_at", desc=True).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error getting reviews for {client_id}: {e}")
            return []

# Singleton instance for import
db = Database()

