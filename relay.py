import sys
import zlib  # Compression අයින් කරන්න අවශ්‍යයි
from curl_cffi import requests

def relay():
    url = "https://loginbp.ggpolarbear.com/MajorLogin"
    try:
        raw_body = sys.stdin.buffer.read()
        headers = {
            "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; SM-S918B Build/TP1A.220624.014)",
            "Content-Type": "application/octet-stream",
            "Accept-Encoding": "gzip", # මේක අනිවාර්යයි
            "Connection": "Keep-Alive",
        }

        # chrome110 impersonation එක ගොඩක් stable
        response = requests.post(url, data=raw_body, headers=headers, impersonate="chrome110", timeout=15)
        
        sys.stderr.write(f"DEBUG: Status {response.status_code}\n")

        if response.status_code == 200:
            content = response.content
            
            # පෑච් එක: දත්ත gzip වෙලා ආවොත් ඒක decompress කරනවා
            if response.headers.get("Content-Encoding") == "gzip":
                try:
                    content = zlib.decompress(content, 16 + zlib.MAX_WBITS)
                    sys.stderr.write("DEBUG: Gzip Decompressed Successfully\n")
                except Exception as ze:
                    sys.stderr.write(f"DEBUG: Zlib Error: {str(ze)}\n")

            sys.stdout.buffer.write(content)
        else:
            sys.exit(1)
            
    except Exception as e:
        sys.stderr.write(f"DEBUG: Exception: {str(e)}\n")
        sys.exit(1)

if __name__ == "__main__":
    relay()
