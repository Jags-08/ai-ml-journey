"""
backend/routes/alerts.py
REST endpoints for alert data, cache, and statistics.
"""

from flask import Blueprint, jsonify, current_app, request

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.get("/recent")
def recent():
    """Last 50 threat events."""
    cache = current_app.state["cache"]
    threats = [e for e in cache if e.get("is_attack")][-50:]
    return jsonify(threats)


@alerts_bp.get("/cache")
def full_cache():
    """Full event cache (all event types)."""
    limit = request.args.get("limit", 200, type=int)
    return jsonify(current_app.state["cache"][-limit:])


@alerts_bp.get("/stats")
def stats():
    st  = current_app.state
    cache = st["cache"]
    kb  = len(str(cache)) / 1024
    return jsonify({
        "total":      st["total"],
        "threats":    st["threats"],
        "blocked":    len(st["blocked"]),
        "dispatched": st["dispatched"],
        "ai_count":   st["ai_count"],
        "cache_count": len(cache),
        "cache_kb":   round(kb, 1),
        "thresh":     st["thresh"],
        "channels":   st["channels"],
    })


@alerts_bp.delete("/cache")
def clear_cache():
    current_app.state["cache"].clear()
    return jsonify({"ok": True, "msg": "Cache cleared"})


@alerts_bp.get("/twiml")
def twiml():
    """TwiML endpoint for Twilio voice calls (fallback if direct TwiML fails)."""
    msg = request.args.get("msg", "SafeNet AI security alert. Please review the dashboard.")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">{msg}</Say>
</Response>""", 200, {"Content-Type": "text/xml"}
