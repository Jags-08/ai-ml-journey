"""
backend/routes/analysis.py
LLM analysis endpoints — supports LM Studio, Ollama, OpenAI, Claude.
"""

from flask import Blueprint, jsonify, request, current_app, Response, stream_with_context
import requests as req_lib
import json

analysis_bp = Blueprint("analysis", __name__)


# ── Analyze events ───────────────────────────────────────────────────
@analysis_bp.post("/analyze")
def analyze():
    data   = request.json or {}
    events = data.get("events")
    if not events:
        pending = current_app.state["pending_ai"]
        events  = pending[:6]
        current_app.state["pending_ai"] = pending[6:]
    if not events:
        return jsonify({"ok": False, "error": "No events"}), 400
    try:
        text = current_app.llm.analyze_threats(events)
        current_app.state["ai_count"] += len(events)
        return jsonify({"ok": True, "analysis": text, "count": len(events),
                        "provider": current_app.llm._active})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ── Copilot ──────────────────────────────────────────────────────────
@analysis_bp.post("/copilot")
def copilot():
    data  = request.json or {}
    query = data.get("query", "").strip()
    if not query:
        return jsonify({"ok": False, "error": "No query"}), 400
    try:
        response = current_app.llm.copilot(query, current_app.state)
        return jsonify({"ok": True, "response": response,
                        "provider": current_app.llm._active})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ── LLM health / status ──────────────────────────────────────────────
@analysis_bp.get("/status")
def status():
    try:
        health = current_app.llm.health_check()
        return jsonify({"ok": True, **health})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ── Set mode ─────────────────────────────────────────────────────────
@analysis_bp.post("/set-mode")
def set_mode():
    data = request.json or {}
    mode = data.get("mode", "auto")
    current_app.llm.set_mode(mode)
    return jsonify({"ok": True, "mode": mode})


# ── Set model (any provider) ─────────────────────────────────────────
@analysis_bp.post("/set-model")
def set_model():
    data     = request.json or {}
    provider = data.get("provider", "lmstudio")  # lmstudio|ollama|openai
    model    = data.get("model", "").strip()
    if not model:
        return jsonify({"ok": False, "error": "No model name"}), 400
    if provider == "lmstudio":
        current_app.llm.set_lmstudio_model(model)
    elif provider == "ollama":
        current_app.llm.set_ollama_model(model)
    elif provider == "openai":
        current_app.llm.set_openai_model(model)
    return jsonify({"ok": True, "provider": provider, "model": model})


# ── List LM Studio models ─────────────────────────────────────────────
@analysis_bp.get("/lmstudio/models")
def lmstudio_models():
    try:
        url = current_app.cfg.LM_STUDIO_URL
        r   = req_lib.get(f"{url}/v1/models", timeout=4)
        models = [m["id"] for m in r.json().get("data", [])]
        return jsonify({"ok": True, "models": models,
                        "url": url,
                        "current": current_app.llm.lmstudio_model})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e), "models": []})


# ── Stream a prompt through LM Studio ────────────────────────────────
@analysis_bp.post("/lmstudio/stream")
def lmstudio_stream():
    """
    Server-sent events stream from LM Studio.
    Frontend receives tokens in real time.
    """
    data   = request.json or {}
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"ok": False, "error": "No prompt"}), 400

    cfg   = current_app.cfg
    model = current_app.llm.lmstudio_model or "auto"

    def generate():
        try:
            resp = req_lib.post(
                f"{cfg.LM_STUDIO_URL}/v1/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content":
                         "You are SafeNet AI. Answer cybersecurity questions only. "
                         "Be concise and clinical."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.12,
                    "max_tokens":  500,
                    "stream": True,
                },
                headers={"Content-Type": "application/json"},
                timeout=60,
                stream=True,
            )
            for line in resp.iter_lines():
                if line:
                    line = line.decode("utf-8")
                    if line.startswith("data: "):
                        chunk = line[6:]
                        if chunk == "[DONE]":
                            yield "data: [DONE]\n\n"
                            break
                        try:
                            obj = json.loads(chunk)
                            delta = obj.get("choices", [{}])[0].get("delta", {})
                            token = delta.get("content", "")
                            if token:
                                yield f"data: {json.dumps({'token': token})}\n\n"
                        except Exception:
                            pass
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Test a specific prompt on any provider ───────────────────────────
@analysis_bp.post("/test-prompt")
def test_prompt():
    data     = request.json or {}
    prompt   = data.get("prompt", "Describe a brute force attack in one sentence.")
    provider = data.get("provider", current_app.llm.mode)
    try:
        old_mode = current_app.llm.mode
        current_app.llm.mode = provider
        result = current_app.llm._run(prompt)
        current_app.llm.mode = old_mode
        return jsonify({"ok": True, "result": result, "provider": provider})
    except Exception as e:
        current_app.llm.mode = old_mode
        return jsonify({"ok": False, "error": str(e)}), 500
