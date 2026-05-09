#!/usr/bin/env python3
import sys
import zlib
import os
import brotli
from curl_cffi import requests as cffi_requests

# ⚙️ CONFIGURATION
REMOTE_URL = "https://loginbp.ggpolarbear.com/MajorLogin"
# Realme Tailscale IP - socks5h පාවිච්චි කරන්නේ DNS එකත් ෆෝන් එකෙන්ම යවන්න
SOCKS5_PROXY = os.getenv('SOCKS5_PROXY', 'socks5h://100.117.207.88:1080')
DEBUG = os.getenv('DEBUG', '1') == '1'

def log(msg, level="INFO"):
    if DEBUG:
        prefix = f"[{level}]"
        sys.stderr.write(f"{prefix} {msg}\n")
        sys.stderr.flush()

def get_android_chrome_120_headers(content_length):
    return {
        "host": "loginbp.ggpolarbear.com",
        "connection": "keep-alive",
        "content-length": str(content_length),
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-ch-ua-platform-version": '"14"',
        "user-agent": "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        "origin": "null",
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "content-type": "application/octet-stream",
        "dnt": "1",
    }

def relay_via_socks5():
    try:
        # Node.js එකෙන් එවන Body එක කියවීම
        raw_body = sys.stdin.buffer.read()
        body_size = len(raw_body)

        if body_size == 0:
            log("ERROR: Empty payload received!", level="ERROR")
            sys.exit(1)

        log(f"Captured {body_size} bytes")

        session = cffi_requests.Session()
        
        # ✅ Proxy Keys හරියටම මේ විදියට තියෙන්න ඕනේ (http/https)
        session.proxies = {
            "http": SOCKS5_PROXY,
            "https": SOCKS5_PROXY,
        }

        headers = get_android_chrome_120_headers(body_size)
        log(f"Forwarding via {SOCKS5_PROXY}...")

        # ⚡ Chrome 120 Fingerprint එක impersonate කරනවා
        response = session.post(
            REMOTE_URL,
            data=raw_body,
            headers=headers,
            impersonate="chrome120",
            http_version=2,
            timeout=30,
            verify=True,
            allow_redirects=False,
        )

        status = response.status_code
        log(f"Response status: {status}")

        if status == 503:
            log("Got 503! Cloudflare blocked VPS IP. Check Proxy!", level="ERROR")
            # මෙතනදී උඹට දැනගන්න පුළුවන් Proxy එක වැඩද නැද්ද කියලා
            sys.exit(1)
        elif status != 200:
            log(f"Non-200 status code: {status}", level="ERROR")
            sys.exit(1)

        content = response.content
        
        # Content-Encoding එක අනුව Decode කිරීම
        encoding = response.headers.get("content-encoding", "").lower()
        if encoding == "gzip":
            content = zlib.decompress(content, 16 + zlib.MAX_WBITS)
            log("Decompressed gzip response")
        elif encoding == "br":
            content = brotli.decompress(content)
            log("Decompressed brotli response")

        # අවසාන Buffer එක Node.js stdout එකට යවනවා
        sys.stdout.buffer.write(content)
        sys.stdout.buffer.flush()

        log("✅ Relay successful!", level="SUCCESS")
        sys.exit(0)

    except Exception as e:
        log(f"Fatal error: {str(e)}", level="FATAL")
        sys.exit(1)

if __name__ == "__main__":
    relay_via_socks5()
