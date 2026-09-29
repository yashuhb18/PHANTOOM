import logging
from typing import Optional, Dict, Any
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import MONGODB_URI, MONGODB_DB_NAME, MONGODB_ENABLED

logger = logging.getLogger("phantom.db.mongo")

# Global singleton client references
_sync_client: Optional[MongoClient] = None
_async_client: Optional[AsyncIOMotorClient] = None

def get_mongo_client() -> Optional[MongoClient]:
    """Returns a synchronous PyMongo client instance."""
    global _sync_client
    if not MONGODB_ENABLED or not MONGODB_URI:
        return None
    if _sync_client is None:
        try:
            _sync_client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                retryWrites=True
            )
        except Exception as e:
            logger.error(f"Failed to initialize PyMongo client: {e}")
            return None
    return _sync_client

def get_async_mongo_client() -> Optional[AsyncIOMotorClient]:
    """Returns an asynchronous Motor client instance for FastAPI async routes."""
    global _async_client
    if not MONGODB_ENABLED or not MONGODB_URI:
        return None
    if _async_client is None:
        try:
            _async_client = AsyncIOMotorClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
        except Exception as e:
            logger.error(f"Failed to initialize Motor client: {e}")
            return None
    return _async_client

def get_mongo_db():
    """Returns synchronous Database object."""
    client = get_mongo_client()
    if client is not None:
        return client[MONGODB_DB_NAME]
    return None

def get_async_mongo_db():
    """Returns asynchronous Motor Database object."""
    client = get_async_mongo_client()
    if client is not None:
        return client[MONGODB_DB_NAME]
    return None

def check_mongo_health() -> Dict[str, Any]:
    """Tests connection to MongoDB Atlas."""
    if not MONGODB_ENABLED or not MONGODB_URI:
        return {"status": "disabled", "connected": False, "provider": "MongoDB Atlas"}
    try:
        client = get_mongo_client()
        if client is None:
            return {"status": "error", "connected": False, "error": "Client uninitialized"}
        client.admin.command("ping")
        db = client[MONGODB_DB_NAME]
        collections = db.list_collection_names()
        return {
            "status": "online",
            "connected": True,
            "provider": "MongoDB Atlas",
            "database": MONGODB_DB_NAME,
            "collections": collections
        }
    except Exception as e:
        logger.warning(f"MongoDB Atlas health check failed: {e}")
        return {
            "status": "offline",
            "connected": False,
            "provider": "MongoDB Atlas",
            "error": str(e)
        }

def init_mongo():
    """
    Initializes collections, creates performance indexes, and seeds administrative roles.
    """
    if not MONGODB_ENABLED or not MONGODB_URI:
        logger.info("MongoDB Atlas disabled or not configured. Using local SQLite.")
        return False

    try:
        client = get_mongo_client()
        if client is None:
            return False

        # Ping
        client.admin.command("ping")
        db = client[MONGODB_DB_NAME]
        logger.info(f"✅ Connected to MongoDB Atlas Cluster ({MONGODB_DB_NAME})")

        # 1. Users collection indexes
        users = db["users"]
        users.create_index([("username", ASCENDING)], unique=True)
        users.create_index([("email", ASCENDING)], unique=True)

        # Seed default admin if missing
        if users.count_documents({"username": "admin"}) == 0:
            users.insert_one({
                "username": "admin",
                "email": "admin@phantom.sec",
                "password_hash": "phantom2026",  # Can upgrade to bcrypt hash
                "role": "Lead Security Architect",
                "provider": "credentials",
                "created_at": "2026-09-29T00:00:00Z"
            })
            logger.info("Created default administrator in MongoDB Atlas users collection.")

        # 2. Events collection indexes (SIEM speed)
        events = db["events"]
        events.create_index([("timestamp", DESCENDING)])
        events.create_index([("session_id", ASCENDING)])
        events.create_index([("event_code", ASCENDING)])
        events.create_index([("severity", ASCENDING)])
        events.create_index([("sourcetype", ASCENDING)])
        events.create_index([("summary", TEXT), ("raw_log", TEXT)])

        # 3. Sessions collection indexes
        sessions = db["sessions"]
        sessions.create_index([("session_id", ASCENDING)], unique=True)
        sessions.create_index([("inserted_at", DESCENDING)])

        # 4. Alerts collection indexes
        alerts = db["alerts"]
        alerts.create_index([("alert_id", ASCENDING)], unique=True)
        alerts.create_index([("created_at", DESCENDING)])

        # 5. Hardware scans collection (for USB photo scanner feature!)
        scans = db["hardware_scans"]
        scans.create_index([("scan_id", ASCENDING)], unique=True)
        scans.create_index([("created_at", DESCENDING)])

        logger.info("✅ MongoDB Atlas collections and SIEM text indexes verified.")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB Atlas: {e}")
        return False
