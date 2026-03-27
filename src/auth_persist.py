"""
src/auth_persist.py
====================
Handles persistent login via browser localStorage.
Injects JS to save/read/clear a 'cs_uid' key.
Works across page refreshes and tab reopens.
"""

import streamlit as st
import streamlit.components.v1 as components


def inject_auth_js():
    """
    Inject JS that:
    1. On load — reads cs_uid from localStorage and sets ?uid= in URL if missing
    2. Runs silently, no visible UI
    """
    components.html("""
    <script>
    (function() {
        var uid = localStorage.getItem('cs_uid');
        if (uid) {
            var params = new URLSearchParams(window.location.search);
            if (!params.get('uid')) {
                params.set('uid', uid);
                // Replace URL with uid param to trigger Streamlit re-read
                var newUrl = window.location.pathname + '?' + params.toString();
                window.location.replace(newUrl);
            }
        }
    })();
    </script>
    """, height=0, scrolling=False)


def save_uid_to_storage(uid: str):
    """Save uid to localStorage on login."""
    components.html(f"""
    <script>
    localStorage.setItem('cs_uid', '{uid}');
    console.log('CareerSync: saved uid to localStorage');
    </script>
    """, height=0, scrolling=False)


def clear_uid_from_storage():
    """Remove uid from localStorage on logout."""
    components.html("""
    <script>
    localStorage.removeItem('cs_uid');
    console.log('CareerSync: cleared uid from localStorage');
    </script>
    """, height=0, scrolling=False)