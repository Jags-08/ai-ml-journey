"""
backend/routes/intelligence.py
All advanced feature API endpoints.
"""

import io
from flask import Blueprint, jsonify, request, current_app

intel_bp = Blueprint("intel", __name__)


# ════ IP Intelligence ════════════════════════════════════════════
@intel_bp.get("/ip/<ip>")
def ip_info(ip):
    app = current_app
    intel  = app.ip_intel.analyze(ip)
    ti     = app.threat_intel.score_ip(ip)
    intel["reputation"] = ti
    return jsonify(intel)

@intel_bp.get("/ip/map")
def attack_map():
    cache = current_app.state["cache"]
    threats = [e for e in cache if e.get("is_attack")][-200:]
    return jsonify(current_app.ip_intel.get_attack_map_data(threats))

@intel_bp.get("/blacklist")
def blacklist():
    return jsonify({"ips": current_app.threat_intel.get_blacklist()})

@intel_bp.post("/blacklist/add")
def blacklist_add():
    ip = (request.json or {}).get("ip","")
    if not ip: return jsonify({"ok":False,"error":"No IP"}), 400
    current_app.threat_intel.add_to_blacklist(ip, reason="manual")
    current_app.soar.manual_action("BLOCK_IP", ip, reason="Manually blacklisted via dashboard")
    return jsonify({"ok":True})

@intel_bp.delete("/blacklist/<ip>")
def blacklist_remove(ip):
    current_app.threat_intel.remove_from_blacklist(ip)
    current_app.soar.unblock_ip(ip)
    return jsonify({"ok":True})


# ════ Email Analysis ═════════════════════════════════════════════
@intel_bp.post("/email/analyze")
def email_analyze():
    d       = request.json or {}
    result  = current_app.email_analyzer.analyze(
        sender  = d.get("sender",""),
        subject = d.get("subject",""),
        body    = d.get("body",""),
        headers = d.get("headers"),
    )
    return jsonify(result)

@intel_bp.post("/email/analyze-eml")
def email_analyze_eml():
    """Analyze a raw .eml file upload."""
    if "file" not in request.files:
        return jsonify({"ok":False,"error":"No file"}), 400
    f    = request.files["file"]
    raw  = f.read().decode("utf-8","ignore")
    # Parse basic headers and body
    parts   = raw.split("\n\n", 1)
    headers = {}
    body    = parts[1] if len(parts) > 1 else raw
    for line in parts[0].split("\n"):
        if ":" in line:
            k,_,v = line.partition(":")
            headers[k.strip()] = v.strip()
    result = current_app.email_analyzer.analyze(
        sender  = headers.get("From","unknown"),
        subject = headers.get("Subject",""),
        body    = body,
        headers = headers,
    )
    return jsonify(result)


# ════ SOAR ═══════════════════════════════════════════════════════
@intel_bp.get("/soar/log")
def soar_log():
    return jsonify(current_app.soar.get_audit_log())

@intel_bp.get("/soar/stats")
def soar_stats():
    return jsonify(current_app.soar.get_stats())

@intel_bp.post("/soar/action")
def soar_action():
    d = request.json or {}
    result = current_app.soar.manual_action(
        action = d.get("action","ALERT_ONLY"),
        target = d.get("target",""),
        reason = d.get("reason","manual"),
    )
    return jsonify(result)

@intel_bp.post("/soar/unblock")
def soar_unblock():
    ip = (request.json or {}).get("ip","")
    current_app.soar.unblock_ip(ip)
    return jsonify({"ok":True})


# ════ UBA ════════════════════════════════════════════════════════
@intel_bp.get("/uba/profiles")
def uba_profiles():
    return jsonify(current_app.uba.get_all_profiles())

@intel_bp.get("/uba/alerts")
def uba_alerts():
    return jsonify(current_app.uba.get_alerts())

@intel_bp.get("/uba/risks")
def uba_risks():
    return jsonify(current_app.uba.get_risk_scores())

@intel_bp.post("/uba/event")
def uba_event():
    d = request.json or {}
    alert = current_app.uba.record_event(
        user_id    = d.get("user_id","unknown"),
        event_type = d.get("type","login"),
        metadata   = d.get("metadata",{}),
    )
    return jsonify({"alert": alert})

@intel_bp.post("/uba/simulate")
def uba_simulate():
    n = current_app.uba.simulate_events(n=30)
    return jsonify({"alerts_generated": n})


# ════ File Scanner ════════════════════════════════════════════════
@intel_bp.post("/files/scan")
def file_scan():
    if "file" not in request.files:
        return jsonify({"ok":False,"error":"No file uploaded"}), 400
    f      = request.files["file"]
    result = current_app.file_scanner.scan(
        filename = f.filename,
        content  = f.read(),
    )
    return jsonify(result)

@intel_bp.get("/files/history")
def file_history():
    return jsonify(current_app.file_scanner.get_history())


# ════ AI Copilot ════════════════════════════════════════════════
@intel_bp.post("/copilot/chat")
def copilot_chat():
    d     = request.json or {}
    query = d.get("query","").strip()
    if not query:
        return jsonify({"ok":False,"error":"No query"}), 400
    try:
        response = current_app.llm.copilot(query, current_app.state)
        return jsonify({"ok":True,"response":response,"query":query})
    except Exception as e:
        return jsonify({"ok":False,"error":str(e)}), 500


# ════ XAI Explainer ══════════════════════════════════════════════
@intel_bp.post("/xai/explain")
def xai_explain():
    d        = request.json or {}
    event    = d.get("event",{})
    score    = d.get("score", 75)
    features = d.get("features",["anomaly_score","ip_reputation","behavioral_pattern"])
    try:
        explanation = current_app.llm.explain_threat(event, score, features)
        return jsonify({"ok":True,"explanation":explanation})
    except Exception as e:
        return jsonify({"ok":False,"error":str(e)}), 500


# ════ Reports ═════════════════════════════════════════════════════
@intel_bp.get("/report/summary")
def report_summary():
    st  = current_app.state
    cache = st["cache"]
    types = {}
    for e in cache:
        if e.get("is_attack"):
            t = e.get("type","UNKNOWN")
            types[t] = types.get(t,0)+1
    top = sorted(types.items(), key=lambda x: x[1], reverse=True)[:5]
    stats = {
        "total": st["total"], "threats": st["threats"],
        "blocked": len(st["blocked"]), "dispatched": st["dispatched"],
    }
    try:
        summary = current_app.llm.report_summary(
            stats       = stats,
            top_threats = [f"{t[0]} ({t[1]})" for t in top],
        )
    except Exception:
        summary = "LLM offline — rule-based summary: Monitoring active. Review individual threat logs for details."
    return jsonify({"summary": summary, "stats": stats, "top_threats": top})
