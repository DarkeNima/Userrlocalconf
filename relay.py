#!/usr/bin/env python3
import sys
import zlib
import os
import brotli
import socket
from curl_cffi import requests as cffi_requests

# ⚙️ CONFIGURATION
REMOTE_URL = "https://loginbp.ggpolarbear.com/MajorLogin"
# Env එකෙන් එන Proxy එක ගමු, නැත්නම් default එක ගමු
SOCKS5_PROXY = os.getenv('SOCKS5_PROXY', 'socks5h://100.117.207.88:1080')
DEBUG = os.getenv('DEBUG', '1') == '1'

def log(msg, level="INFO"):
    if DEBUG:
        prefix = f"[{level}]"
        sys.stderr.write(f"{prefix} {msg}\n")
        sys.stderr.flush()

def test_proxy():
    """Proxy එකට connect වෙන්න පුළුවන්ද කියලා check කරනවා"""
    try:
        # socks5h://100.x.x.x:1080 -> 100.x.x.x , 1080
        cleaned_proxy = SOCKS5_PROXY.split("://")[-1]
        host, port = cleaned_proxy.split(":")
        
        with socket.create_connection((host, int(port)), timeout=5):
            log("✅ Proxy host is reachable", level="SUCCESS")
            return True
    except Exception as e:
        log(f"❌ Proxy connectivity check failed: {e}", level="ERROR")
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
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    }

def relay_via_socks5():
    try:
        # Body එක කියවීම
        raw_body = sys.stdin.buffer.read()
        body_size = len(raw_body)

        if body_size == 0:
            log("ERROR: Empty payload received from Node.js", level="ERROR")
            sys.exit(1)

        log(f"Captured {body_size} bytes")
        test_proxy()

        # Proxy configuration
        proxies_config = {
            "http": SOCKS5_PROXY,
            "https": SOCKS5_PROXY
        }
        
        headers = get_headers(body_size)
        log(f"Attempting relay via {SOCKS5_PROXY}")

        # 🚀 HTTP/1.1 attempt (More stable for SOCKS5 tunneling)
        response = cffi_requests.post(
            REMOTE_URL,
            data=raw_body,
            headers=headers,
            proxies=proxies_config,
            impersonate="chrome120",
            http_version=1.1,
            timeout=30,
            verify=True,
            allow_redirects=False
        )

        status = response.status_code
        log(f"Response status: {status}")

        if status != 200:
            log(f"Relay failed with status {status}. Cloudflare is still blocking.", level="ERROR")
            if "cf-ray" in response.headers:
                log(f"CF-Ray: {response.headers['cf-ray']}")
            sys.exit(1)

        # Decompression logic
        content = response.content
        encoding = response.headers.get("content-encoding", "").lower()
        
        if encoding == "gzip":
            content = zlib.decompress(content, 16 + zlib.MAX_WBITS)
        elif encoding == "br":
            content = brotli.decompress(content)

        # Output the clean buffer to Node.js
        sys.stdout.buffer.write(content)
        sys.stdout.buffer.flush()
        
        log("✅ Relay successful!", level="SUCCESS")
        sys.exit(0)

    except Exception as e:
        log(f"Fatal error in Python relay: {str(e)}", level="FATAL")
        sys.exit(1)

if __name__ == "__main__":
    relay_via_socks5()
