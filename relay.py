#!/usr/bin/env python3
import sys
import zlib
import os
import brotli
import socket
from curl_cffi import requests as cffi_requests

# ⚙️ CONFIGURATION
REMOTE_URL = "https://loginbp.ggpolarbear.com/MajorLogin"
SOCKS5_PROXY = os.getenv('SOCKS5_PROXY', 'socks5h://100.117.207.88:1080')
DEBUG = os.getenv('DEBUG', '1') == '1'

def log(msg, level="INFO"):
    if DEBUG:
        prefix = f"[{level}]"
        sys.stderr.write(f"{prefix} {msg}\n")
        sys.stderr.flush()

def test_proxy():
    """Proxy එක වැඩද කියලා check කරනවා"""
    try:
        proxy_parts = SOCKS5_PROXY.replace("socks5h://", "").split(":")
        host = proxy_parts[0]
        port = int(proxy_parts[1])
        with socket.create_connection((host, port), timeout=5):
            log("✅ Proxy is reachable", level="SUCCESS")
            return True
    except Exception as e:
        log(f"❌ Proxy Connection Failed: {e}", level="ERROR")
        return False

def get_headers(content_length):
    return {
        "host": "loginbp.ggpolarbear.com",
        "content-length": str(content_length),
        "user-agent": "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br",
        "content-type": "application/octet-stream",
        "sec-ch-ua-platform": '"Android"',
        "sec-ch-ua-mobile": "?1",
    }

def relay_via_socks5():
    try:
        raw_body = sys.stdin.buffer.read()
        body_size = len(raw_body)

        if body_size == 0:
            log("ERROR: Empty payload", level="ERROR")
            sys.exit(1)

        log(f"Captured {body_size} bytes")
        test_proxy()

        proxies_config = {"http": SOCKS5_PROXY, "https": SOCKS5_PROXY}
        headers = get_headers(body_size)

        # 🚀 ATTEMPT 1: HTTP/1.1 (Stable with Proxies)
        log(f"Attempt 1: Forwarding via {SOCKS5_PROXY} (HTTP/1.1)")
        response = cffi_requests.post(
            REMOTE_URL,
            data=raw_body,
            headers=headers,
            proxies=proxies_config,
            impersonate="chrome120",
            http_version=1.1,  # ⬅️ HTTP/1.1 වලට මාරු කළා
            timeout=30,
            verify=True
        )

        # 🔄 ATTEMPT 2: Fallback to HTTP/2 if 1.1 fails
        if response.status_code == 503:
            log("Got 503 with HTTP/1.1. Attempt 2: Trying HTTP/2...", level="WARN")
            response = cffi_requests.post(
                REMOTE_URL,
                data=raw_body,
                headers=headers,
                proxies=proxies_config,
                impersonate="chrome120",
                http_version=2,
                timeout=30
            )

        status = response.status_code
        log(f"Final Response Status: {status}")

        if status != 200:
            log(f"Relay failed with status {status}", level="ERROR")
            # Cloudflare Ray ID එක තිබුණොත් ඒකත් ලොග් කරනවා debug කරන්න
            if "cf-ray" in response.headers:
                log(f"CF-Ray: {response.headers['cf-ray']}")
            sys.exit(1)

        content = response.content
        encoding = response.headers.get("content-encoding", "").lower()
        
        if encoding == "gzip":
            content = zlib.decompress(content, 16 + zlib.MAX_WBITS)
        elif encoding == "br":
            content = brotli.decompress(content)

        sys.stdout.buffer.write(content)
        sys.stdout.buffer.flush()
        log("✅ Relay successful!", level="SUCCESS")
        sys.exit(0)

    except Exception as e:
        log(f"Fatal error: {str(e)}", level="FATAL")
        sys.exit(1)

if __name__ == "__main__":
    relay_via_socks5()
