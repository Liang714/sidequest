"""The two transactional emails this app sends today. Plain, deliberately
undesigned — a real HTML template pass is a fast-follow once there's a
custom domain to make the sender address look legitimate anyway
(see docs/DEPLOYMENT.md), not a blocker for the emails to actually work.
"""

from app.email.base import EmailMessage


def build_verification_email(*, to: str, link: str) -> EmailMessage:
    text = (
        "Welcome to SIDEQUEST!\n\n"
        "Confirm your email address to secure your account and enable password recovery:\n"
        f"{link}\n\n"
        "This link expires in 24 hours. If you didn't create a SIDEQUEST account, ignore this email."
    )
    html = (
        "<p>Welcome to SIDEQUEST!</p>"
        "<p>Confirm your email address to secure your account and enable password recovery:</p>"
        f'<p><a href="{link}">{link}</a></p>'
        "<p>This link expires in 24 hours. If you didn't create a SIDEQUEST account, ignore this email.</p>"
    )
    return EmailMessage(to=to, subject="Confirm your SIDEQUEST email", text_body=text, html_body=html)


def build_password_reset_email(*, to: str, link: str) -> EmailMessage:
    text = (
        "Someone (hopefully you) requested a password reset for your SIDEQUEST account.\n\n"
        f"Reset your password: {link}\n\n"
        "This link expires in 1 hour and can only be used once. "
        "If you didn't request this, you can safely ignore this email — your password won't change."
    )
    html = (
        "<p>Someone (hopefully you) requested a password reset for your SIDEQUEST account.</p>"
        f'<p><a href="{link}">Reset your password</a></p>'
        "<p>This link expires in 1 hour and can only be used once. "
        "If you didn't request this, you can safely ignore this email — your password won't change.</p>"
    )
    return EmailMessage(to=to, subject="Reset your SIDEQUEST password", text_body=text, html_body=html)
