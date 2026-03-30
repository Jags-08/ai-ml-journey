"""config/settings.py — All SafeNet AI v4 configuration from .env"""
import os
from dotenv import load_dotenv
load_dotenv()

class Settings:
    # ── Server ───────────────────────────────────────────────────────
    PORT         = int(os.getenv("PORT", 5000))
    DEBUG        = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY   = os.getenv("SECRET_KEY", "safenet-v4-change-me")

    # ── LLM Mode ─────────────────────────────────────────────────────
    # auto     = LM Studio → Ollama → OpenAI → Claude → rule-based
    # lmstudio = LM Studio only (your local 20B model)
    # ollama   = Ollama only
    # openai   = OpenAI GPT only
    # claude   = Claude API only
    LLM_MODE     = os.getenv("LLM_MODE", "auto")
    LLM_TIMEOUT  = int(os.getenv("LLM_TIMEOUT", 45))

    # ── LM Studio (local OpenAI-compatible server) ───────────────────
    # Start server in LM Studio → Local Server tab → Start Server
    # Default port is 1234. Load your OSS 20B model before starting.
    LM_STUDIO_URL   = os.getenv("LM_STUDIO_URL", "http://localhost:1234")
    LM_STUDIO_MODEL = os.getenv("LM_STUDIO_MODEL", "auto")  # auto = detect from /v1/models

    # ── Ollama (local) ───────────────────────────────────────────────
    OLLAMA_URL   = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

    # ── OpenAI GPT (cloud) ───────────────────────────────────────────
    OPENAI_KEY   = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

    # ── Claude API (cloud fallback) ──────────────────────────────────
    CLAUDE_KEY   = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

    # ── Twilio SMS + Voice ───────────────────────────────────────────
    TWILIO_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM  = os.getenv("TWILIO_FROM_NUMBER", "")
    SMS_TO       = os.getenv("SMS_RECIPIENT", "")
    CALL_TO      = os.getenv("CALL_RECIPIENT", "")
    CALL_THRESH  = os.getenv("CALL_THRESHOLD", "CRITICAL")

    # ── SendGrid Email ───────────────────────────────────────────────
    SENDGRID_KEY = os.getenv("SENDGRID_API_KEY", "")
    EMAIL_FROM   = os.getenv("EMAIL_FROM", "safenet@yourdomain.com")
    EMAIL_TO     = os.getenv("EMAIL_TO", "")
    EMAIL_FREQ   = os.getenv("EMAIL_FREQ", "instant")

    # ── Webhook / SIEM ───────────────────────────────────────────────
    WEBHOOK_URL   = os.getenv("WEBHOOK_URL", "")
    WEBHOOK_TOKEN = os.getenv("WEBHOOK_TOKEN", "")
    WEBHOOK_FMT   = os.getenv("WEBHOOK_FORMAT", "json")

    # ── Threat Intelligence APIs ─────────────────────────────────────
    ABUSEIPDB_KEY  = os.getenv("ABUSEIPDB_KEY", "")
    VIRUSTOTAL_KEY = os.getenv("VIRUSTOTAL_KEY", "")

    # ── Simulation / Detection ───────────────────────────────────────
    LOG_RATE_MS    = int(os.getenv("LOG_RATE_MS", 250))
    ATTACK_RATE    = float(os.getenv("ATTACK_RATE", 0.11))
    CACHE_LIMIT    = int(os.getenv("CACHE_LIMIT", 1000))
    DEFAULT_THRESH = os.getenv("DEFAULT_THRESHOLD", "HIGH")
