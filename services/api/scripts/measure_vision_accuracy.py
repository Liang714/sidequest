"""Measures VisionVerifier's false-positive/false-negative rate against a
small labeled synthetic dataset — the measurement docs/ROADMAP.md Phase 8's
exit criteria requires *before* vision verification is allowed to gate
real XP awards.

Not part of `uv run pytest`: it makes real Ollama vision calls (slow,
model-output-dependent, not the fast/deterministic-suite convention
tests/test_ai.py documents for AI paths) and its purpose is a one-time
(or re-run-when-the-model-changes) measurement, not a pass/fail gate on
every commit. See docs/AI.md §VisionVerifier for the last recorded result.

Run from services/api: uv run python scripts/measure_vision_accuracy.py
"""

import asyncio
import io
import sys
from dataclasses import dataclass
from pathlib import Path

# Run as a plain script (not `-m`), so `app` isn't on sys.path by default —
# services/api (this script's parent) needs adding explicitly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PIL import Image, ImageDraw, ImageFont

from app.vision.providers.ollama_vision import OllamaVisionProvider

HOST = "http://127.0.0.1:11434"
MODEL = "llava:7b"


@dataclass(frozen=True)
class TestCase:
    name: str
    image: Image.Image
    claim: str
    expected_match: bool


def _shape_image(shape: str, color: str, bg: str = "white", size: int = 256) -> Image.Image:
    img = Image.new("RGB", (size, size), bg)
    d = ImageDraw.Draw(img)
    pad = size // 4
    box = [pad, pad, size - pad, size - pad]
    if shape == "circle":
        d.ellipse(box, fill=color)
    elif shape == "square":
        d.rectangle(box, fill=color)
    elif shape == "triangle":
        d.polygon([(size // 2, pad), (pad, size - pad), (size - pad, size - pad)], fill=color)
    return img


def _text_image(text: str, size: int = 256) -> Image.Image:
    img = Image.new("RGB", (size, size), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
    except OSError:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - w) / 2, (size - h) / 2), text, fill="black", font=font)
    return img


def build_test_cases() -> list[TestCase]:
    red_circle = _shape_image("circle", "red")
    blue_square = _shape_image("square", "blue")
    green_triangle = _shape_image("triangle", "green")
    stop_text = _text_image("STOP")
    plain_white = Image.new("RGB", (256, 256), "white")

    return [
        # True positives — claim matches what's actually in the image
        TestCase("red_circle_pos", red_circle, "a red circle", True),
        TestCase("blue_square_pos", blue_square, "a blue square", True),
        TestCase("green_triangle_pos", green_triangle, "a green triangle", True),
        TestCase("stop_text_pos", stop_text, "the word STOP", True),
        TestCase("red_circle_pos2", red_circle, "a red shape", True),
        # True negatives — claim does NOT match what's in the image
        TestCase("red_circle_neg_color", red_circle, "a blue circle", False),
        TestCase("red_circle_neg_shape", red_circle, "a red square", False),
        TestCase("blue_square_neg", blue_square, "a green triangle", False),
        TestCase("green_triangle_neg", green_triangle, "the word STOP", False),
        TestCase("stop_text_neg", stop_text, "a red circle", False),
        TestCase("plain_white_neg", plain_white, "a red circle", False),
        TestCase("plain_white_neg2", plain_white, "the word STOP", False),
    ]


async def main() -> None:
    provider = OllamaVisionProvider(host=HOST, model=MODEL)
    cases = build_test_cases()

    false_positives = 0  # said match=True when it should have been False
    false_negatives = 0  # said match=False when it should have been True
    correct = 0
    errors = 0

    print(f"Running {len(cases)} labeled test cases against {MODEL}...\n")
    for case in cases:
        buf = io.BytesIO()
        case.image.save(buf, format="PNG")
        try:
            result = await provider.verify(image_bytes=buf.getvalue(), objective_description=case.claim)
        except Exception as exc:  # noqa: BLE001 — measurement script, record and continue
            print(f"  [ERROR] {case.name}: {exc}")
            errors += 1
            continue

        outcome = "correct"
        if result.matches and not case.expected_match:
            false_positives += 1
            outcome = "FALSE POSITIVE"
        elif not result.matches and case.expected_match:
            false_negatives += 1
            outcome = "FALSE NEGATIVE"
        else:
            correct += 1

        print(
            f"  [{outcome:15}] {case.name:22} claim={case.claim!r:22} "
            f"expected={case.expected_match!s:5} got={result.matches!s:5} "
            f"conf={result.confidence:.2f} — {result.explanation}"
        )

    total = len(cases) - errors
    print(f"\n{'=' * 70}")
    print(f"Total cases: {len(cases)}  (errors: {errors})")
    if total:
        print(f"Correct:         {correct}/{total} ({100 * correct / total:.0f}%)")
        print(f"False positives: {false_positives}/{total} ({100 * false_positives / total:.0f}%)")
        print(f"False negatives: {false_negatives}/{total} ({100 * false_negatives / total:.0f}%)")
    print(f"{'=' * 70}")
    print(
        "\nConclusion: at this error rate, vision verification is advisory-only —\n"
        "it does NOT gate objective completion or XP awards. See\n"
        "app/routers/quests.py::verify_photo_objective and docs/AI.md §VisionVerifier."
    )


if __name__ == "__main__":
    asyncio.run(main())
