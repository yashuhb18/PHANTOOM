"""
Google OAuth 2.0 Authentication Routes
Verifies Google ID tokens / Access tokens from frontend Google Identity Services (GIS)
and synchronizes with MongoDB Atlas users collection.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
from backend.config import GOOGLE_CLIENT_ID
from backend.db.mongo import get_async_mongo_db

logger = logging.getLogger("phantom.auth")
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None      # The JWT id_token from Google Identity Services
    access_token: Optional[str] = None    # Access token from Google OAuth2 token client


@router.post("/google")
async def google_auth(payload: GoogleAuthRequest):
    """
    Verify a Google credential (ID token) or access token and return user info.
    Also synchronizes authenticated user to MongoDB Atlas if available.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth client ID not configured on server.")

    email = ""
    name = "Google User"
    picture = ""
    sub = ""

    # Option A: Verify ID Token (JWT)
    if payload.credential:
        try:
            idinfo = id_token.verify_oauth2_token(
                payload.credential,
                google_requests.Request(),
                GOOGLE_CLIENT_ID
            )
            email = idinfo.get("email", "")
            name = idinfo.get("name", "Google User")
            picture = idinfo.get("picture", "")
            sub = idinfo.get("sub", "")
        except Exception as e:
            logger.warning(f"ID token verification failed: {e}. Trying userinfo fallback...")
            # Fallback to tokeninfo endpoint
            try:
                resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}", timeout=5)
                if resp.status_code == 200:
                    info = resp.json()
                    email = info.get("email", "")
                    name = info.get("name", "Google User")
                    picture = info.get("picture", "")
                    sub = info.get("sub", "")
                else:
                    raise ValueError(f"Google tokeninfo error: {resp.text}")
            except Exception as ex:
                raise HTTPException(status_code=401, detail=f"Invalid Google ID token: {str(ex)}")

    # Option B: Verify Access Token
    elif payload.access_token:
        try:
            resp = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.access_token}"},
                timeout=5
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google access token")
            info = resp.json()
            email = info.get("email", "")
            name = info.get("name", "Google User")
            picture = info.get("picture", "")
            sub = info.get("sub", "")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Failed to fetch userinfo from Google: {e}")
    else:
        raise HTTPException(status_code=400, detail="Missing Google credential or access_token in request body.")

    if not email:
        raise HTTPException(status_code=400, detail="Unable to retrieve verified email from Google account.")

    # Synchronize / Upsert into MongoDB if enabled
    role = "SOC Threat Hunter"
    try:
        db = get_async_mongo_db()
        if db is not None:
            users_col = db["users"]
            existing = await users_col.find_one({"email": email})
            if existing:
                role = existing.get("role", role)
                await users_col.update_one(
                    {"email": email},
                    {"$set": {
                        "username": name,
                        "picture": picture,
                        "last_login": "now",
                        "provider": "google"
                    }}
                )
            else:
                await users_col.insert_one({
                    "username": name,
                    "email": email,
                    "picture": picture,
                    "google_id": sub,
                    "role": role,
                    "provider": "google",
                    "created_at": "now"
                })
            logger.info(f"MongoDB synced for Google user: {email}")
    except Exception as e:
        logger.warning(f"Failed to sync user with MongoDB (proceeding anyway): {e}")

    user_obj = {
        "username": name,
        "email": email,
        "picture": picture,
        "role": role,
        "provider": "google",
        "token": f"google-auth-{sub or email}"
    }

    logger.info(f"✅ Google OAuth login successful for {email} ({name})")
    return {
        "success": True,
        "user": user_obj
    }


@router.get("/google/client-id")
async def get_google_client_id():
    """Return the Google Client ID for frontend initialization."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=404, detail="Google OAuth not configured.")
    return {"client_id": GOOGLE_CLIENT_ID}
