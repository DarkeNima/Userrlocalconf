import sys
import zlib
from curl_cffi import requests

def relay():
    url = "https://loginbp.ggpolarbear.com/MajorLogin"
    try:
        raw_body = sys.stdin.buffer.read()
        
        # Real Android App එකකින් යන විදියටම Headers සකස් කිරීම
        headers = {
            "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; SM-S918B Build/TP1A.220624.014)",
            "Content-Type": "application/octet-stream",
            "Accept-Encoding": "gzip",
            "Connection": "Keep-Alive",
            "X-Unity-Version": "2021.3.15f1",
        }

        # http_version එකට කෙලින්ම 2 දාලා බලමු (HTTP/2 සපෝට් එක සඳහා)
        response = requests.post(
            url, 
            data=raw_body, 
            headers=headers, 
            impersonate="chrome120", 
            http_version=2,  # කෙලින්ම number එක දාන්න
            timeout=15
        )
        
        sys.stderr.write(f"DEBUG: Status {response.status_code}\n")

        if response.status_code == 200:
            content = response.content
            if response.headers.get("Content-Encoding") == "gzip":
                try:
                    content = zlib.decompress(content, 16 + zlib.MAX_WBITS)
                    sys.stderr.write("DEBUG: Decompressed Success\n")
                except:
                    pass
            sys.stdout.buffer.write(content)
        else:
            # 503 එකේ HTML එකේ තියෙන දේ බලන්න
            sys.stderr.write(f"DEBUG: Error Body: {response.text[:50]}\n")
            sys.exit(1)
            
    except Exception as e:
        sys.stderr.write(f"DEBUG: Python Exception: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    relay()
