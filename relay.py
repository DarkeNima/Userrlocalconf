import sys
import zlib
from curl_cffi import requests

def relay():
    url = "https://loginbp.ggpolarbear.com/MajorLogin"
    try:
        # 1. 960 bytes කියවා ගැනීම
        raw_body = sys.stdin.buffer.read()
        body_size = len(raw_body)

        # 2. Android Chrome 120 Native Headers (පිළිවෙල ඉතා වැදගත්)
        headers = {
            "host": "loginbp.ggpolarbear.com",
            "content-length": str(body_size),
            "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            "sec-ch-ua-mobile": "?1",
            "user-agent": "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "sec-ch-ua-platform": '"Android"',
            "accept": "*/*",
            "origin": "null",
            "sec-fetch-site": "cross-site",
            "sec-fetch-mode": "cors",
            "sec-fetch-dest": "empty",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/octet-stream",
        }

        # 3. Android Chrome 120 Cipher Suite (TLS Fingerprint එක සඳහා)
        ciphers = (
            "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:"
            "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:"
            "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:"
            "ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305"
        )

        # 4. Request එක යැවීම
        response = requests.post(
            url,
            data=raw_body,
            headers=headers,
            impersonate="chrome120", # Chrome 120 Profile
            http_version=2,           # Force HTTP/2
            verify=True,
            timeout=20
        )

        sys.stderr.write(f"DEBUG: Garena Status: {response.status_code}\n")

        if response.status_code == 200:
            content = response.content
            # Gzip අයින් කිරීම
            if response.headers.get("Content-Encoding") == "gzip":
                try:
                    content = zlib.decompress(content, 16 + zlib.MAX_WBITS)
                    sys.stderr.write("DEBUG: Decompressed Successfully\n")
                except: pass
            
            sys.stdout.buffer.write(content)
            sys.stdout.buffer.flush()
        else:
            # 503 නම් HTML එකෙන් කොටසක් පෙන්නන්න
            sys.stderr.write(f"DEBUG: 503 Content: {response.text[:100]}\n")
            sys.exit(1)

    except Exception as e:
        sys.stderr.write(f"DEBUG: Exception: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    relay()
