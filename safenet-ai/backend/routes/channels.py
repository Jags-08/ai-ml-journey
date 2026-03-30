"""
backend/routes/channels.py
Configure, test, and manually dispatch to alert channels.
"""

from flask import Blueprint, jsonify, request, current_app

channels_bp = Blueprint("channels", __name__)


@channels_bp.post("/configure")
def configure():
    """
    Body: { channel: "sms"|"email"|"call"|"webhook", enabled: bool }
    Also accepts credential fields — forward to cfg at runtime.
    """
    data = request.json or {}
    ch   = data.get("channel")
    if ch not in current_app.state["channels"]:
        return jsonify({"ok": False, "error": "Unknown channel"}), 400
    current_app.state["channels"][ch] = bool(data.get("enabled", False))
    return jsonify({"ok": True, "channels": current_app.state["channels"]})


@channels_bp.post("/test")
def test_channel():
    """Send a test message on the specified channel."""
    data = request.json or {}
    ch   = data.get("channel")
    app  = current_app

    try:
        if ch == "sms":
            sid = app.sms.send_test()
            return jsonify({"ok": True, "msg": f"SMS sent — SID: {sid}"})
        elif ch == "email":
            app.email.send_test()
            return jsonify({"ok": True, "msg": "Test email dispatched"})
        elif ch == "call":
            sid = app.call.make_test_call()
            return jsonify({"ok": True, "msg": f"Call initiated — SID: {sid}"})
        elif ch == "webhook":
            import requests as req
            url = app.cfg.WEBHOOK_URL
            if not url:
                return jsonify({"ok": False, "error": "Webhook URL not set in .env"}), 400
            r = req.post(url, json={"test": True, "source": "SafeNet AI"}, timeout=5)
            return jsonify({"ok": True, "msg": f"Webhook responded {r.status_code}"})
        else:
            return jsonify({"ok": False, "error": "Unknown channel"}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@channels_bp.post("/dispatch")
def manual_dispatch():
    """Manually dispatch a specific event to all active channels."""
    data  = request.json or {}
    event = data.get("event")
    if not event:
        return jsonify({"ok": False, "error": "No event provided"}), 400

    from backend.app import _dispatch_event
    _dispatch_event(current_app._get_current_object(), event)
    return jsonify({"ok": True, "msg": "Dispatched to active channels"})


@channels_bp.get("/status")
def status():
    return jsonify(current_app.state["channels"])
