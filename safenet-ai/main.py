"""SafeNet AI v4 — Entry Point. Run: python main.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from config.settings import Settings
from backend.app import create_app, socketio

def banner():
    print("""
╔══════════════════════════════════════════════════════════════╗
║          S A F E N E T   A I   v 4 . 0                      ║
║   Advanced Threat Intelligence & Detection Platform          ║
╠══════════════════════════════════════════════════════════════╣
║  Dashboard  →  http://localhost:5000                         ║
║  API        →  http://localhost:5000/api                     ║
║  LLM        →  Ollama (local)  +  Claude (fallback)          ║
║  Modules    →  DPI · Email · IP Intel · UBA · SOAR · Files  ║
╚══════════════════════════════════════════════════════════════╝
""")

if __name__ == "__main__":
    banner()
    cfg = Settings()
    app = create_app(cfg)
    print(f"  LLM Mode  : {cfg.LLM_MODE}  ({cfg.OLLAMA_MODEL} @ {cfg.OLLAMA_URL})")
    print(f"  SMS       : {'✓ Twilio' if cfg.TWILIO_SID else '✗ not set'}")
    print(f"  Email     : {'✓ SendGrid' if cfg.SENDGRID_KEY else '✗ not set'}")
    print(f"  AbuseIPDB : {'✓ active' if cfg.ABUSEIPDB_KEY else '✗ not set (optional)'}\n")
    socketio.run(app, host="0.0.0.0", port=cfg.PORT, debug=cfg.DEBUG,
                 use_reloader=False, log_output=False)
