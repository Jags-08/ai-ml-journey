"""backend/app.py — Flask app factory, all services initialized."""
import time, threading
from flask import Flask, send_from_directory, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

from backend.services.llm_service          import LLMService
from backend.services.log_generator        import LogGenerator
from backend.services.sms_service          import SMSService
from backend.services.email_service        import EmailService
from backend.services.call_service         import CallService
from backend.services.threat_intel_service import ThreatIntelService
from backend.services.ip_intelligence_service import IPIntelligenceService
from backend.services.email_analyzer_service  import EmailAnalyzerService
from backend.services.uba_service          import UBAService
from backend.services.soar_service         import SOARService
from backend.services.file_scanner_service import FileScannerService

from backend.routes.alerts     import alerts_bp
from backend.routes.channels   import channels_bp
from backend.routes.analysis   import analysis_bp
from backend.routes.intelligence import intel_bp

socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")
SEV_RANK = {"MEDIUM":1,"HIGH":2,"CRITICAL":3}

def create_app(cfg):
    app = Flask(__name__, static_folder="../frontend", template_folder="../frontend")
    app.config["SECRET_KEY"] = cfg.SECRET_KEY
    CORS(app); socketio.init_app(app)

    # ── Init all services ────────────────────────────────────────────
    app.llm           = LLMService(cfg)
    app.log_gen       = LogGenerator(cfg.ATTACK_RATE)
    app.sms           = SMSService(cfg)
    app.email_notif   = EmailService(cfg)
    app.call          = CallService(cfg)
    app.threat_intel  = ThreatIntelService(cfg)
    app.ip_intel      = IPIntelligenceService(cfg)
    app.email_analyzer= EmailAnalyzerService(llm_service=app.llm)
    app.uba           = UBAService(llm_service=app.llm)
    app.file_scanner  = FileScannerService(llm_service=app.llm)
    app.soar          = SOARService(llm_service=app.llm)
    app.cfg           = cfg

    app.state = {
        "total":0,"threats":0,"blocked":set(),"dispatched":0,"ai_count":0,
        "cache":[],"pending_ai":[],"thresh":cfg.DEFAULT_THRESH,
        "channels":{"sms":False,"email":False,"call":False,"webhook":False},
    }

    # ── Blueprints ───────────────────────────────────────────────────
    app.register_blueprint(alerts_bp,   url_prefix="/api/alerts")
    app.register_blueprint(channels_bp, url_prefix="/api/channels")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    app.register_blueprint(intel_bp,    url_prefix="/api/intel")

    @app.route("/")
    @app.route("/dashboard")
    def dashboard(): return send_from_directory("../frontend","index.html")

    @app.route("/api")
    def api_index(): return jsonify({"name":"SafeNet AI","version":"4.0.0","status":"active"})

    # ── WebSocket handlers ───────────────────────────────────────────
    @socketio.on("connect")
    def on_connect(): socketio.emit("state_sync", _snap(app.state))

    @socketio.on("set_threshold")
    def on_thresh(d): app.state["thresh"] = d.get("thresh","HIGH")

    @socketio.on("toggle_channel")
    def on_channel(d):
        ch = d.get("channel"); app.state["channels"][ch] = d.get("enabled",False)

    @socketio.on("clear_cache")
    def on_clear(_): app.state["cache"].clear(); socketio.emit("cache_cleared",{})

    @socketio.on("soar_action")
    def on_soar(d):
        entry = app.soar.manual_action(d.get("action","ALERT_ONLY"), d.get("target",""), d.get("reason","manual"))
        socketio.emit("soar_executed", entry)

    # ── Background threads ───────────────────────────────────────────
    for fn in (_sim_loop, _ai_loop, _uba_sim_loop):
        t = threading.Thread(target=fn, args=(app,cfg), daemon=True)
        t.start()

    return app


def _sim_loop(app, cfg):
    tick = 0
    while True:
        with app.app_context():
            n = __import__("random").randint(1,3)
            for _ in range(n):
                e  = app.log_gen.generate()
                st = app.state
                st["total"] += 1
                st["cache"].append(e)
                if len(st["cache"]) > cfg.CACHE_LIMIT: st["cache"].pop(0)

                if e["is_attack"]:
                    # Enrich with threat intel
                    e = app.threat_intel.enrich_event(e)
                    if e.get("auto_blocked"): st["blocked"].add(e["ip"])
                    st["threats"] += 1
                    st["pending_ai"].append(e)
                    # SOAR evaluation
                    soar_result = app.soar.evaluate(e)
                    if soar_result:
                        if soar_result["action"] in ("BLOCK_IP","ISOLATE_HOST"):
                            st["blocked"].add(e["ip"])
                        socketio.emit("soar_executed", soar_result)
                    _dispatch(app, e)
                    socketio.emit("threat_alert", e)

                socketio.emit("log_event", e)
            tick += 1
            if tick % 5 == 0:
                socketio.emit("stats_update", _stats(app.state))
        time.sleep(cfg.LOG_RATE_MS / 1000)


def _ai_loop(app, cfg):
    while True:
        time.sleep(15)
        with app.app_context():
            st = app.state
            if not st["pending_ai"]: continue
            batch = st["pending_ai"][:6]; st["pending_ai"] = st["pending_ai"][6:]
            socketio.emit("ai_thinking", {"status":"analyzing"})
            try:
                text = app.llm.analyze_threats(batch)
                st["ai_count"] += len(batch)
                socketio.emit("ai_result",{"text":text,"count":st["ai_count"],"batch":len(batch)})
            except Exception as ex:
                socketio.emit("ai_result",{"text":f"Analysis error: {ex}","count":st["ai_count"],"batch":0})


def _uba_sim_loop(app, cfg):
    """Periodically inject simulated UBA events."""
    time.sleep(10)
    while True:
        with app.app_context():
            alert = app.uba.simulate_events(n=5)
            alerts = app.uba.get_alerts()
            if alerts:
                latest = alerts[-1]
                socketio.emit("uba_alert", latest)
        time.sleep(30)


def _dispatch(app, event):
    st  = app.state; cfg = app.cfg
    if SEV_RANK.get(event.get("sev"),0) < SEV_RANK.get(st["thresh"],2): return
    dispatched = []
    if st["channels"].get("sms") and cfg.TWILIO_SID:
        try: app.sms.send(event); dispatched.append("sms"); st["dispatched"]+=1
        except Exception as e: print(f"[SMS] {e}")
    if st["channels"].get("email") and cfg.SENDGRID_KEY:
        try: app.email_notif.send(event); dispatched.append("email"); st["dispatched"]+=1
        except Exception as e: print(f"[Email] {e}")
    if st["channels"].get("call") and cfg.TWILIO_SID:
        if SEV_RANK.get(event.get("sev"),0) >= SEV_RANK.get(cfg.CALL_THRESH,3):
            try: app.call.make_call(event); dispatched.append("call"); st["dispatched"]+=1
            except Exception as e: print(f"[Call] {e}")
    if st["channels"].get("webhook") and cfg.WEBHOOK_URL:
        try:
            import requests as req
            h = {"Content-Type":"application/json"}
            if cfg.WEBHOOK_TOKEN: h["Authorization"]=f"Bearer {cfg.WEBHOOK_TOKEN}"
            req.post(cfg.WEBHOOK_URL, json=event, headers=h, timeout=5)
            dispatched.append("webhook"); st["dispatched"]+=1
        except Exception as e: print(f"[Webhook] {e}")
    if dispatched:
        socketio.emit("dispatch_confirmed",{"channels":dispatched,"event_id":event.get("id")})


def _stats(st):
    c=st["cache"]; kb=len(str(c))/1024
    return {"total":st["total"],"threats":st["threats"],"blocked":len(st["blocked"]),
            "dispatched":st["dispatched"],"ai_count":st["ai_count"],
            "cache_count":len(c),"cache_kb":round(kb,1)}

def _snap(st):
    s=_stats(st); s["thresh"]=st["thresh"]; s["channels"]=st["channels"]
    s["recent"]=st["cache"][-50:]; return s
