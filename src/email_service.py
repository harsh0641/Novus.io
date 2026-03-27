"""
src/email_service.py — CareerSync Gmail Scraper
Reads EMAIL_ACCOUNT and EMAIL_APP_PASSWORD from os.environ
(injected per-user by auth.inject_gmail_env before calling this)
"""

import imaplib
import email
from email.header import decode_header
import os
import re
from datetime import datetime, timedelta


def _get(key, default=""):
    try:
        import streamlit as st
        val = st.secrets.get(key, "")
        if val:
            return val
    except Exception:
        pass
    return os.getenv(key, default)


# ── Broad keywords — cast a wide net, AI does the real filtering ──────────────
APPLICATION_KEYWORDS = [
    "thank you for applying",
    "thanks for applying",
    "we received your application",
    "application confirmation",
    "application received",
    "successfully submitted",
    "your application has been",
    "application is in",
    "application submitted",
    "we got your application",
    "you applied",
    "thank you for your interest",
    "thank you for sharing",
    "your candidacy",
    "for the position",
    "for the role",
    "joining our team",
]

SPAM_SENDERS = [
    "newsletter@",
    "noreply@newsletter",
    "promotions@",
    "unsubscribe@",
    "marketing@",
    "jobalerts@indeed",
    "alerts@linkedin",
    "noreply@glassdoor",
    "noreply@ziprecruiter",
    "jobs-noreply@linkedin",
]

SUBJECT_KEYWORDS = [
    "application", "applied", "thank you for", "thanks for",
    "we received", "your candidacy", "position", "role",
    "interest", "is in", "submitted", "confirmation",
    "opportunity", "joining", "career", "interview",
]

MAX_EMAILS = 60


def decode_str(value):
    if value is None:
        return ""
    decoded_parts = decode_header(value)
    result = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            try:
                result += part.decode(encoding or "utf-8", errors="replace")
            except Exception:
                result += part.decode("utf-8", errors="replace")
        else:
            result += part
    return result


def get_email_body(msg) -> str:
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and \
               "attachment" not in str(part.get("Content-Disposition", "")):
                try:
                    body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                    break
                except Exception:
                    continue
        if not body:
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    try:
                        raw_html = part.get_payload(decode=True).decode("utf-8", errors="replace")
                        body = re.sub(r'<[^>]+>', ' ', raw_html)
                        body = re.sub(r'\s+', ' ', body).strip()
                        break
                    except Exception:
                        continue
    else:
        try:
            body = msg.get_payload(decode=True).decode("utf-8", errors="replace")
        except Exception:
            body = ""
    return body[:1200]


def is_spam(sender: str) -> bool:
    sender_lower = sender.lower()
    return any(s in sender_lower for s in SPAM_SENDERS)


def subject_is_relevant(subject: str) -> bool:
    subject_lower = subject.lower()
    return any(kw in subject_lower for kw in SUBJECT_KEYWORDS)


def fetch_application_emails() -> list[dict]:
    """
    Fetch job-related emails from the last 60 days.
    Reads credentials from os.environ (set by inject_gmail_env)
    or falls back to Streamlit secrets / .env.
    """
    # Always read at call-time so per-user injection works
    account  = os.environ.get("EMAIL_ACCOUNT")      or _get("EMAIL_ACCOUNT")
    password = os.environ.get("EMAIL_APP_PASSWORD")  or _get("EMAIL_APP_PASSWORD")

    if not account or not password:
        raise ValueError("Gmail credentials not configured. Please set your Gmail account and App Password in Settings.")

    results = []

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com", timeout=20)
        mail.login(account, password)
        mail.select("inbox")

        since_date = (datetime.now() - timedelta(days=60)).strftime("%d-%b-%Y")
        seen_ids = set()

        for keyword in APPLICATION_KEYWORDS:
            if len(seen_ids) >= MAX_EMAILS:
                break

            query = f'(SINCE "{since_date}" TEXT "{keyword}")'
            status, data = mail.search(None, query)
            if status != "OK":
                continue

            email_ids = data[0].split()
            print(f"[email_service] '{keyword}' → {len(email_ids)} hits")

            for eid in email_ids:
                if len(seen_ids) >= MAX_EMAILS:
                    break
                if eid in seen_ids:
                    continue

                try:
                    status, header_data = mail.fetch(
                        eid, "(BODY[HEADER.FIELDS (FROM SUBJECT DATE)])")
                    if status != "OK":
                        continue

                    msg_header = email.message_from_bytes(header_data[0][1])
                    sender   = decode_str(msg_header.get("From", ""))
                    subject  = decode_str(msg_header.get("Subject", ""))
                    date_str = msg_header.get("Date", "")

                    if is_spam(sender):
                        continue
                    if not subject_is_relevant(subject):
                        continue

                    seen_ids.add(eid)

                    status, msg_data = mail.fetch(eid, "(RFC822)")
                    if status != "OK":
                        continue

                    msg  = email.message_from_bytes(msg_data[0][1])
                    body = get_email_body(msg)

                    try:
                        formatted_date = email.utils.parsedate_to_datetime(
                            date_str).strftime("%Y-%m-%d")
                    except Exception:
                        formatted_date = datetime.now().strftime("%Y-%m-%d")

                    results.append({
                        "subject": subject,
                        "body":    body,
                        "sender":  sender,
                        "date":    formatted_date,
                    })

                except Exception as e:
                    print(f"[email_service] Error on {eid}: {e}")
                    continue

        mail.logout()
        print(f"[email_service] ✓ {len(results)} candidate emails ready for AI.")

    except Exception as e:
        print(f"[email_service] Error: {e}")
        raise

    return results