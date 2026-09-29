import os
from pathlib import Path
from dotenv import load_dotenv

# Base Directory
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

# Server Config
HOST = os.getenv("PHANTOM_HOST", "0.0.0.0")
PORT = int(os.getenv("PHANTOM_PORT", "8001"))
DEBUG = os.getenv("PHANTOM_DEBUG", "True").lower() == "true"

# Security Config
SECRET_KEY = os.getenv("PHANTOM_SECRET_KEY", "phantom-super-secret-key-2026")
API_KEY = os.getenv("PHANTOM_API_KEY", "phantom-admin-key")

# Database & Storage
DB_PATH = BASE_DIR / os.getenv("PHANTOM_DB_NAME", "phantom.db")
DECOY_DIR = BASE_DIR / "decoy_files"

# MongoDB Atlas Cloud Database Config
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "phantom_soc")
MONGODB_ENABLED = bool(MONGODB_URI)

# Deception & Agent Config
CANARY_WATCH_ENABLED = os.getenv("CANARY_WATCH_ENABLED", "True").lower() == "true"
AI_NARRATION_INTERVAL = float(os.getenv("AI_NARRATION_INTERVAL", "1.5"))

# AI / Ollama Inference Engine Config (DeepSeek-R1 1.5B Cyber SOC Engine)
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
AI_MODEL = os.getenv("AI_MODEL", os.getenv("GLM_MODEL", "babar_jamali/deepseek-r-11.5b-cyber"))
GLM_MODEL = AI_MODEL  # Backwards compatibility alias
AI_TIMEOUT = float(os.getenv("AI_TIMEOUT", os.getenv("GLM_TIMEOUT", "60.0")))
GLM_TIMEOUT = AI_TIMEOUT
AI_ENABLED = os.getenv("AI_ENABLED", os.getenv("GLM_ENABLED", "True")).lower() == "true"
GLM_ENABLED = AI_ENABLED


