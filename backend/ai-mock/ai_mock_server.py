#!/usr/bin/env python3
"""신중 - 물품 인증 AI 모의(mock) 서버.

진짜 AI 서버가 완성되기 전까지 백엔드를 테스트할 때 씁니다.
규격은 docs/AI_SERVER_SPEC.md와 같고, 추가 설치 없이 Python 3만 있으면 됩니다.

실행:  python3 ai-mock/ai_mock_server.py          (기본 포트 8600)
       PORT=9000 python3 ai-mock/ai_mock_server.py (포트 바꾸기)

백엔드 .env.local 설정:  AI_SERVER_URL=http://127.0.0.1:8600/verify
"""
import hashlib
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer


class MockAiHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            body = {}

        # 진짜 AI 대신, 입력값에 따라 60~100 사이 점수를 일정하게 만들어 돌려줍니다.
        # (같은 입력이면 항상 같은 점수가 나와서 테스트하기 좋습니다)
        seed = f"{body.get('itemId')}:{body.get('authType')}:{body.get('serialNumber')}"
        score = 60 + int(hashlib.sha256(seed.encode()).hexdigest(), 16) % 41

        result = {
            "photoVerified": score >= 70,  # 70점 이상이면 사진 검토 통과로 판정
            "reliabilityScore": float(score),
            "modelVersion": "mock-1",
        }
        data = json.dumps(result).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        print("[ai-mock]", fmt % args)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8600"))
    print(f"[ai-mock] 모의 AI 서버 실행 중: http://127.0.0.1:{port}/verify (끄기: Ctrl+C)")
    HTTPServer(("0.0.0.0", port), MockAiHandler).serve_forever()
