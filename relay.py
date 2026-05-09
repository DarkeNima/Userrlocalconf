import sys
import zlib
from curl_cffi import requests

def relay():
    url = "https://loginbp.ggpolarbear.com/MajorLogin"
    try:
        raw_body = sys.stdin.buffer.read()
        
        # ගේම් එකට ගොඩක් සමාන හෙඩර්ස් ටිකක්
        headers = {
            "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; SM-S918B Build/TP1A.220624.014)",
            "Content-Type": "application/octet-stream",
            "Accept-Encoding": "gzip",
            "X-Unity-Version": "2021.3.15f1", # මේක ගේම් එකේ එන්ජින් එකේ වර්ෂන් එක (සමහර විට උදව් වෙයි)
            "Connection": "Keep-Alive",
        }

        # chrome120 සහ HTTP/2 දාලා බලමු
        response = requests.post(
            url, 
            data=raw_body, 
            headers=headers, 
            impersonate="chrome120", 
            http_version=requests.HttpVersion.V2, # HTTP/2 පාවිච්චි කිරීම
            timeout=15
        )
        
        sys.stderr.write(f"DEBUG: Status {response.status_code}\n")

        if response.status_code == 200:
            content = response.content
            if response.headers.get("Content-Encoding") == "gzip":
                content = zlib.decompress(content, 16 + zlib.MAX_WBITS)
            sys.stdout.buffer.write(content)
        else:
            # 503 ආවොත් ඒකෙ HTML එක පොඩ්ඩක් බලන්න (ඇයි බ්ලොක් කළේ කියලා තේරුම් ගන්න)
            sys.stderr.write(f"DEBUG: 503 Response: {response.text[:100]}\n")
            sys.exit(1)
            
    except Exception as e:
        sys.stderr.write(f"DEBUG: Exception: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    relay()
