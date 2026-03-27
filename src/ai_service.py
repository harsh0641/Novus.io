"""
src/ai_service.py — CareerSync AI Email Parser via Groq
Reads GROQ_API_KEY from Streamlit secrets first, falls back to .env
"""

import os
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed


def _get(key, default=""):
    try:
        import streamlit as st
        val = st.secrets.get(key, "")
        if val:
            return val
    except Exception:
        pass
    return os.getenv(key, default)


def _groq_key():
    return _get("GROQ_API_KEY")


SYSTEM_PROMPT = """You are a job application email classifier.

Given an email (subject + body + sender), determine if it is a real job application confirmation or status update.

Return ONLY valid JSON in this exact format:
{
  "is_application": true or false,
  "company_name": "Company Name",
  "job_title": "Job Title",
  "date": "YYYY-MM-DD",
  "subject": "email subject",
  "stage": "Applied"
}

Rules:
- is_application: true ONLY for real job application confirmations, interview invites, offer letters, or rejections
- is_application: false for job alerts, newsletters, recruiter spam, LinkedIn notifications
- company_name: extract from email domain or body (never use "Unknown")
- job_title: extract exact title from email (use "Software Engineer" if unclear)
- stage: one of "Applied", "Interview", "Offer", "Rejected"
- date: use the email date provided
- Return ONLY the JSON object, no markdown, no explanation"""


def _parse_single(email_data: dict) -> dict | None:
    """Parse one email via Groq. Returns application dict or None."""
    groq_key = _groq_key()
    if not groq_key:
        return None

    subject = email_data.get("subject", "")
    body    = email_data.get("body", "")[:800]
    sender  = email_data.get("sender", "")
    date    = email_data.get("date", "")

    prompt = f"""Email Date: {date}
From: {sender}
Subject: {subject}

Body:
{body}

Classify this email and return JSON."""

    try:
        import requests
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Content-Type":  "application/json",
                "Authorization": f"Bearer {groq_key}",
            },
            json={
                "model":       "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                "temperature": 0,
                "max_tokens":  200,
            },
            timeout=15,
        )

        if resp.status_code != 200:
            print(f"[ai_service] Groq HTTP {resp.status_code}: {resp.text[:200]}")
            return None

        raw = resp.json()["choices"][0]["message"]["content"].strip()
        raw = re.sub(r"```(?:json)?", "", raw).strip()
        data = json.loads(raw)

        if not data.get("is_application"):
            return None

        return {
            "company_name": data.get("company_name", "Unknown").strip(),
            "job_title":    data.get("job_title",    "Software Engineer").strip(),
            "date":         data.get("date",         date),
            "subject":      data.get("subject",      subject),
            "stage":        data.get("stage",        "Applied"),
        }

    except json.JSONDecodeError:
        return None
    except Exception as e:
        print(f"[ai_service] Error parsing email: {e}")
        return None


def parse_emails_concurrent(emails: list[dict], max_workers: int = 5) -> list[dict]:
    """
    Parse a list of emails concurrently using Groq.
    Returns only confirmed job applications.
    """
    if not emails:
        return []

    groq_key = _groq_key()
    if not groq_key:
        print("[ai_service] GROQ_API_KEY not set — skipping AI parse")
        return []

    results = []
    seen    = set()

    print(f"[ai_service] Parsing {len(emails)} emails with {max_workers} workers...")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_parse_single, e): e for e in emails}
        for future in as_completed(futures):
            try:
                result = future.result()
                if result:
                    # Deduplicate by company + job title
                    key = f"{result['company_name'].lower()}|{result['job_title'].lower()}"
                    if key not in seen:
                        seen.add(key)
                        results.append(result)
            except Exception as e:
                print(f"[ai_service] Future error: {e}")

    print(f"[ai_service] ✓ {len(results)} real applications identified")
    return results