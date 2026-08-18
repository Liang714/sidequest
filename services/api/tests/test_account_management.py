"""Moderation queue, account deletion, email verification, and password
reset — the five "real user launch" gaps closed in this pass. See
docs/SECURITY.md §Security review for the full list.
"""

import re

import pytest
from sqlalchemy import select

import app.db as db_module
from app.email.base import EmailMessage
from app.email.service import get_email_provider
from app.main import app
from app.models.identity import User
from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


class _CapturingEmailProvider:
    """Test double — captures every message instead of sending, so tests
    can extract the real token out of the real link the app builds (the
    token itself is only ever stored as a hash — see
    app/security.py::hash_email_token — so this is the only way to get a
    valid raw token in a test without reaching into the DB and
    re-deriving what the app already computed)."""

    name = "capturing"

    def __init__(self) -> None:
        self.messages: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> None:
        self.messages.append(message)


@pytest.fixture
def email_provider():
    provider = _CapturingEmailProvider()
    app.dependency_overrides[get_email_provider] = lambda: provider
    yield provider
    app.dependency_overrides.pop(get_email_provider, None)


def _extract_token(text: str) -> str:
    match = re.search(r"token=([^\s]+)", text)
    assert match is not None, f"no token found in: {text}"
    return match.group(1)


async def _make_admin(email: str) -> None:
    async with db_module.SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email))
        assert user is not None
        user.is_admin = True
        await session.commit()


# ---- Moderation queue -----------------------------------------------------


async def test_report_queue_visible_to_admin_only(client, seed_reference_data):
    reporter = await register(client, email="reporter@example.com", username="reporter")
    target = await register(client, email="target@example.com", username="targetuser")
    target_id = (await client.get("/auth/me", headers=auth_headers(target))).json()["user_id"]

    create = await client.post(
        "/reports",
        json={"target_type": "user", "target_id": target_id, "reason": "Being weird in chat"},
        headers=auth_headers(reporter),
    )
    assert create.status_code == 201, create.text

    # a non-admin can't see the queue
    denied = await client.get("/admin/reports", headers=auth_headers(reporter))
    assert denied.status_code == 403


async def test_admin_can_list_and_resolve_reports(client, seed_reference_data):
    reporter = await register(client, email="reporter2@example.com", username="reporter2")
    target = await register(client, email="target2@example.com", username="targetuser2")
    target_id = (await client.get("/auth/me", headers=auth_headers(target))).json()["user_id"]

    create = await client.post(
        "/reports",
        json={"target_type": "user", "target_id": target_id, "reason": "Spamming quest invites"},
        headers=auth_headers(reporter),
    )
    report_id = create.json()["id"]

    admin = await register(client, email="admin@example.com", username="adminuser")
    await _make_admin("admin@example.com")

    listing = await client.get("/admin/reports", headers=auth_headers(admin))
    assert listing.status_code == 200
    reports = listing.json()
    assert any(r["id"] == report_id for r in reports)
    found = next(r for r in reports if r["id"] == report_id)
    assert found["target_label"] == "@targetuser2"  # resolved, not a bare UUID
    assert found["reporter_username"] == "reporter2"

    resolve = await client.post(
        f"/admin/reports/{report_id}/resolve", json={"action": "dismiss"}, headers=auth_headers(admin)
    )
    assert resolve.status_code == 200
    assert resolve.json()["status"] == "dismissed"

    # resolving twice is a conflict, not silently allowed
    again = await client.post(
        f"/admin/reports/{report_id}/resolve", json={"action": "action"}, headers=auth_headers(admin)
    )
    assert again.status_code == 409

    # resolved reports drop out of the default (open) queue
    still_open = await client.get("/admin/reports", headers=auth_headers(admin))
    assert not any(r["id"] == report_id for r in still_open.json())


# ---- Account deletion ------------------------------------------------------


async def test_account_deletion_requires_correct_password(client, seed_reference_data):
    user = await register(client, email="delete-me@example.com", username="deleteme")
    resp = await client.post(
        "/users/me/delete", json={"password": "wrong-password"}, headers=auth_headers(user)
    )
    assert resp.status_code == 401


async def test_account_deletion_frees_email_and_username_for_reuse(client, seed_reference_data):
    email, username = "delete-me2@example.com", "deleteme2"
    user = await register(client, email=email, username=username)

    resp = await client.post(
        "/users/me/delete", json={"password": "correcthorsebattery"}, headers=auth_headers(user)
    )
    assert resp.status_code == 204

    # the deleted account can no longer log in
    login = await client.post("/auth/login", json={"email": email, "password": "correcthorsebattery"})
    assert login.status_code == 401

    # but the original email/username are free again
    reregister = await client.post(
        "/auth/register",
        json={"email": email, "username": username, "password": "correcthorsebattery", "display_name": "New"},
    )
    assert reregister.status_code == 201, reregister.text


# ---- Email verification ----------------------------------------------------


async def test_registration_sends_a_verification_email(client, email_provider, seed_reference_data):
    await register(client, email="verifyme@example.com", username="verifyme")
    assert len(email_provider.messages) == 1
    assert email_provider.messages[0].to == "verifyme@example.com"
    assert "verify-email?token=" in email_provider.messages[0].text_body


async def test_verify_email_end_to_end_and_single_use(client, email_provider, seed_reference_data):
    tokens = await register(client, email="verifyme2@example.com", username="verifyme2")
    me_before = await client.get("/auth/me", headers=auth_headers(tokens))
    assert me_before.json()["email_verified"] is False

    token = _extract_token(email_provider.messages[0].text_body)
    verify = await client.post("/auth/verify-email", json={"token": token})
    assert verify.status_code == 204

    me_after = await client.get("/auth/me", headers=auth_headers(tokens))
    assert me_after.json()["email_verified"] is True

    reuse = await client.post("/auth/verify-email", json={"token": token})
    assert reuse.status_code == 400


async def test_resend_verification_rejected_once_already_verified(client, email_provider, seed_reference_data):
    tokens = await register(client, email="verifyme3@example.com", username="verifyme3")
    token = _extract_token(email_provider.messages[0].text_body)
    await client.post("/auth/verify-email", json={"token": token})

    resend = await client.post("/auth/resend-verification", headers=auth_headers(tokens))
    assert resend.status_code == 409


# ---- Password reset ---------------------------------------------------------


async def test_forgot_password_always_returns_204(client, email_provider, seed_reference_data):
    await register(client, email="resetme@example.com", username="resetme")
    # register() above already sent one (verification) email — reset the
    # capture so this test only looks at what forgot-password itself does.
    email_provider.messages.clear()

    real = await client.post("/auth/forgot-password", json={"email": "resetme@example.com"})
    assert real.status_code == 204

    nonexistent = await client.post("/auth/forgot-password", json={"email": "nobody-at-all@example.com"})
    assert nonexistent.status_code == 204  # same response either way — see app/routers/auth.py

    # only the real account actually got an email
    assert len(email_provider.messages) == 1
    assert email_provider.messages[0].to == "resetme@example.com"


async def test_reset_password_end_to_end_and_single_use(client, email_provider, seed_reference_data):
    email = "resetme2@example.com"
    await register(client, email=email, username="resetme2")
    await client.post("/auth/forgot-password", json={"email": email})
    # messages[-1]: register() above already sent a verification email
    # first — the reset-password email is whatever was sent most recently.
    token = _extract_token(email_provider.messages[-1].text_body)

    reset = await client.post("/auth/reset-password", json={"token": token, "new_password": "brandnewpassword1"})
    assert reset.status_code == 204

    old_login = await client.post("/auth/login", json={"email": email, "password": "correcthorsebattery"})
    assert old_login.status_code == 401

    new_login = await client.post("/auth/login", json={"email": email, "password": "brandnewpassword1"})
    assert new_login.status_code == 200

    reuse = await client.post("/auth/reset-password", json={"token": token, "new_password": "anotherone123"})
    assert reuse.status_code == 400


async def test_reset_password_rejects_unknown_token(client, seed_reference_data):
    resp = await client.post(
        "/auth/reset-password", json={"token": "not-a-real-token", "new_password": "whatever12345"}
    )
    assert resp.status_code == 400
