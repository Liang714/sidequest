"""Local Ollama vision provider — llava:7b, see docs/AI.md §VisionVerifier
and app/config.py. Free, self-hosted, same cost posture as the text
AIProvider (app/ai/). Uses Ollama's /api/generate with an `images` field
(base64), same request shape as the text path just with an image attached.
"""

import base64
import json
import re

import httpx

from app.vision.base import VisionVerificationError, VisionVerificationResult

_SYSTEM_PROMPT = """You verify whether a photo shows evidence of a specific claimed \
activity or object for a scavenger-hunt-style app. Look carefully at the image, then \
reply with ONLY a single JSON object, no markdown fences, no commentary:
{"matches": true or false, "confidence": number 0.0 to 1.0, "explanation": "one short sentence"}"""


class OllamaVisionProvider:
    name = "ollama-vision"

    def __init__(self, host: str, model: str) -> None:
        self.host = host.rstrip("/")
        self.model = model

    async def verify(self, *, image_bytes: bytes, objective_description: str) -> VisionVerificationResult:
        payload = {
            "model": self.model,
            "system": _SYSTEM_PROMPT,
            "prompt": f'Claimed: "{objective_description}". Does the photo show this?',
            "images": [base64.b64encode(image_bytes).decode()],
            "format": "json",
            "stream": False,
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(f"{self.host}/api/generate", json=payload)
                resp.raise_for_status()
                body = resp.json()
        except httpx.HTTPError as exc:
            raise VisionVerificationError(f"Ollama unreachable at {self.host}: {exc}") from exc

        raw = body.get("response", "")
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise VisionVerificationError("Model response did not contain a JSON object")
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise VisionVerificationError(f"Model response was not valid JSON: {exc}") from exc

        matches = bool(data.get("matches", False))
        try:
            confidence = max(0.0, min(float(data.get("confidence", 0.5)), 1.0))
        except (TypeError, ValueError):
            confidence = 0.5
        explanation = str(data.get("explanation") or "").strip()[:280]

        return VisionVerificationResult(matches=matches, confidence=confidence, explanation=explanation)
