import os
import random
import string
import time
import smtplib
import uuid
import json
import httpx
import urllib.parse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "sketchmind-secret-change-in-prod")
ALGORITHM  = "HS256"
TOKEN_EXP  = 60 * 24 * 7  # 7 days

SMTP_HOST  = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT  = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER  = os.getenv("SMTP_USER", "").strip()
SMTP_PASS  = os.getenv("SMTP_PASS", "").strip()
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
HF_TOKEN   = os.getenv("HF_TOKEN", "").strip()
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()

DB_FILE  = Path("sketchmind_db.json")
OTP_FILE = Path("sketchmind_otp.json")
IMG_DIR  = Path("generated_images")
IMG_DIR.mkdir(exist_ok=True)

def load_db():
    if DB_FILE.exists():
        try:    return json.loads(DB_FILE.read_text())
        except: return {}
    return {}

def save_db(data):
    DB_FILE.write_text(json.dumps(data, indent=2))

def load_otps():
    if OTP_FILE.exists():
        try:
            raw = json.loads(OTP_FILE.read_text())
            return {k: v for k, v in raw.items() if v.get("expires_at", 0) > time.time()}
        except: return {}
    return {}

def save_otps(data):
    OTP_FILE.write_text(json.dumps(data, indent=2))

app = FastAPI(title="SketchMind API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/images", StaticFiles(directory="generated_images"), name="images")

pwd_ctx  = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_pw(pw):      return pwd_ctx.hash(pw)
def verify_pw(p, h):  return pwd_ctx.verify(p, h)
def gen_otp(n=6):     return "".join(random.choices(string.digits, k=n))

def create_token(data):
    payload = {**data, "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXP)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        p = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if not p.get("sub"): raise HTTPException(401, "Invalid token.")
        return {"email": p["sub"], "name": p.get("name")}
    except JWTError:
        raise HTTPException(401, "Invalid or expired token.")

def print_otp(email, otp, purpose):
    label = "SIGNUP" if purpose == "signup" else "PASSWORD RESET"
    print(f"\n╔══════════════════════════════════════════╗")
    print(f"║  SketchMind — {label:<26}║")
    print(f"║  Email : {email:<32}║")
    print(f"║  OTP   : {otp:<32}║")
    print(f"╚══════════════════════════════════════════╝\n")

def otp_html(otp, name, purpose):
    action = "verify your email" if purpose == "signup" else "reset your password"
    return f"""<!DOCTYPE html><html><body style="margin:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:20px;border:1px solid rgba(99,179,237,0.2);">
<tr><td style="background:linear-gradient(135deg,#1e3a5f,#2d6a9f);padding:32px 40px;text-align:center;border-radius:20px 20px 0 0;">
<div style="font-size:26px;font-weight:900;color:#fff;">✦ SketchMind</div>
</td></tr>
<tr><td style="padding:36px;">
<p style="color:#cbd5e1;font-size:15px;margin:0 0 10px;">Hello <strong style="color:#93c5fd;">{name}</strong>,</p>
<p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Your code to {action}:</p>
<div style="background:rgba(96,165,250,0.08);border:2px solid rgba(96,165,250,0.3);border-radius:14px;padding:24px;text-align:center;margin-bottom:20px;">
<div style="font-size:48px;font-weight:900;letter-spacing:14px;color:#60a5fa;font-family:'Courier New',monospace;">{otp}</div>
<div style="color:#64748b;font-size:11px;margin-top:8px;">Expires in 10 minutes</div>
</div>
</td></tr></table></td></tr></table></body></html>"""

def send_otp_email(email, name, otp, purpose):
    print_otp(email, otp, purpose)
    if not SMTP_USER or not SMTP_PASS:
        print("  → No SMTP configured — OTP shown above in terminal.\n")
        return
    try:
        subject = "SketchMind verification code" if purpose == "signup" else "SketchMind password reset"
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"SketchMind <{FROM_EMAIL}>"
        msg["To"]      = email
        msg.attach(MIMEText(otp_html(otp, name, purpose), "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.ehlo(); s.starttls(); s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(FROM_EMAIL, email, msg.as_string())
        print(f"  → Email sent to {email}\n")
    except Exception as e:
        print(f"  → Email failed ({e}) — OTP is in terminal above.\n")

# ── Schemas ───────────────────────────────────────────────────────────────────
class SignupReq(BaseModel): name: str; email: EmailStr; password: str
class VerifyReq(BaseModel): email: EmailStr; otp: str
class LoginReq(BaseModel):  email: EmailStr; password: str
class ResendReq(BaseModel): email: EmailStr
class ForgotReq(BaseModel): email: EmailStr
class ResetReq(BaseModel):  email: EmailStr; otp: str; new_password: str
class GenerateReq(BaseModel):
    prompt: str; negative_prompt: str = ""
    style: str = "realistic"; ratio: str = "square"

# ── Auth routes ───────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    db = load_db()
    return {
        "status": "ok", "service": "SketchMind API v2",
        "registered_users":  len(db),
        "hf_configured":     bool(HF_TOKEN and HF_TOKEN.startswith("hf_")),
        "openai_configured": bool(OPENAI_KEY and OPENAI_KEY.startswith("sk-")),
        "smtp_configured":   bool(SMTP_USER and SMTP_PASS),
    }

@app.post("/auth/signup")
def signup(b: SignupReq):
    db    = load_db()
    email = b.email.lower().strip()
    if email in db and db[email].get("verified"):
        raise HTTPException(400, "This email is already registered. Please log in instead.")
    db[email] = {"name": b.name, "password": hash_pw(b.password), "verified": False, "created": datetime.utcnow().isoformat()}
    save_db(db)
    otps = load_otps()
    otp  = gen_otp()
    otps[email] = {"otp": otp, "expires_at": time.time() + 600, "purpose": "signup", "name": b.name}
    save_otps(otps)
    send_otp_email(email, b.name, otp, "signup")
    return {"message": "OTP sent. Check your email or backend terminal."}

@app.post("/auth/verify-otp")
def verify_otp(b: VerifyReq):
    email = b.email.lower().strip()
    db    = load_db()
    otps  = load_otps()
    if email not in otps:
        raise HTTPException(400, "No OTP found. Please request a new one.")
    rec = otps[email]
    if time.time() > rec["expires_at"]:
        del otps[email]; save_otps(otps)
        raise HTTPException(400, "OTP expired. Please request a new one.")
    if rec["otp"] != b.otp.strip():
        raise HTTPException(400, "Incorrect OTP. Check the terminal for the correct code.")
    del otps[email]; save_otps(otps)
    if rec["purpose"] == "signup":
        if email not in db: raise HTTPException(400, "User not found. Please sign up again.")
        db[email]["verified"] = True; save_db(db)
        token = create_token({"sub": email, "name": db[email]["name"]})
        return {"message": "Email verified!", "access_token": token, "token_type": "bearer",
                "user": {"email": email, "name": db[email]["name"]}}
    return {"message": "OTP verified.", "purpose": rec["purpose"]}

@app.post("/auth/resend-otp")
def resend_otp(b: ResendReq):
    email = b.email.lower().strip()
    db    = load_db()
    if email not in db: raise HTTPException(404, "Email not found.")
    otps    = load_otps()
    purpose = otps.get(email, {}).get("purpose", "signup")
    otp     = gen_otp()
    otps[email] = {"otp": otp, "expires_at": time.time() + 600, "purpose": purpose, "name": db[email]["name"]}
    save_otps(otps)
    send_otp_email(email, db[email]["name"], otp, purpose)
    return {"message": "New OTP sent."}

@app.post("/auth/login")
def login(b: LoginReq):
    email = b.email.lower().strip()
    db    = load_db()
    if email not in db: raise HTTPException(401, "Invalid email or password.")
    u = db[email]
    if not u.get("verified"): raise HTTPException(403, "Email not verified. Complete OTP step first.")
    if not verify_pw(b.password, u["password"]): raise HTTPException(401, "Invalid email or password.")
    token = create_token({"sub": email, "name": u["name"]})
    return {"access_token": token, "token_type": "bearer", "user": {"email": email, "name": u["name"]}}

@app.post("/auth/forgot-password")
def forgot(b: ForgotReq):
    email = b.email.lower().strip()
    db    = load_db()
    print(f"\nForgot password: {email}")
    if email in db and db[email].get("verified"):
        otps = load_otps()
        otp  = gen_otp()
        otps[email] = {"otp": otp, "expires_at": time.time() + 600, "purpose": "reset", "name": db[email]["name"]}
        save_otps(otps)
        send_otp_email(email, db[email]["name"], otp, "reset")
    else:
        print("  Email not found or not verified.")
    return {"message": "If that email is registered, a reset code has been sent. Check terminal."}

@app.post("/auth/reset-password")
def reset_pw(b: ResetReq):
    email = b.email.lower().strip()
    db    = load_db()
    otps  = load_otps()
    if email not in otps:
        raise HTTPException(400, "No reset code found. Please request a new one.")
    rec = otps[email]
    if rec.get("purpose") != "reset":
        raise HTTPException(400, "This code is not a password reset code.")
    if time.time() > rec["expires_at"]:
        del otps[email]; save_otps(otps)
        raise HTTPException(400, "Code expired. Please request a new one.")
    if rec["otp"] != b.otp.strip():
        raise HTTPException(400, "Incorrect code. Check the terminal.")
    del otps[email]; save_otps(otps)
    db[email]["password"] = hash_pw(b.new_password); save_db(db)
    print(f"✓ Password reset for {email}")
    return {"message": "Password reset successfully. You can now log in."}

@app.get("/auth/me")
def me(user=Depends(get_current_user)): return user

# ── Image Generation ──────────────────────────────────────────────────────────
STYLE_KEYWORDS = {
    "realistic":  "photorealistic, 8k, sharp focus",
    "watercolor": "watercolor painting, soft brushstrokes",
    "oil-paint":  "oil painting, thick brushstrokes, canvas",
    "sketch":     "pencil sketch, hand-drawn, graphite",
    "anime":      "anime style, cel-shaded, vibrant",
    "fantasy":    "fantasy art, magical, ethereal lighting",
    "cyberpunk":  "cyberpunk, neon lights, futuristic",
    "minimalist": "minimalist, flat design, clean lines",
}

RATIO_SIZES = {
    "square":    (512, 512),
    "landscape": (768, 512),
    "portrait":  (512, 768),
}

async def generate_pollinations(prompt: str, width: int, height: int, style: str) -> str:
    style_tag = STYLE_KEYWORDS.get(style, "")

    # Keep prompt SHORT — max 80 chars base + short style tag = stays under URL limit
    base      = prompt[:80].strip()
    full      = f"{base}, {style_tag}" if style_tag else base
    seed      = random.randint(1, 99999)
    encoded   = urllib.parse.quote(full)
    url       = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&seed={seed}&nologo=true"

    print(f"  Prompt sent: {full}")
    print(f"  URL length : {len(url)} chars")

    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        r = await client.get(url)

    print(f"  Status: {r.status_code} | Content-Type: {r.headers.get('content-type','?')}")

    if r.status_code == 200 and "image" in r.headers.get("content-type", ""):
        img_id   = str(uuid.uuid4())
        img_path = IMG_DIR / f"{img_id}.png"
        img_path.write_bytes(r.content)
        print(f"  ✓ Saved {img_path} ({len(r.content)//1024}KB)")
        return f"http://localhost:8000/images/{img_id}.png"

    raise Exception(f"Pollinations returned {r.status_code}")

async def generate_huggingface(prompt: str, width: int, height: int, style: str) -> str:
    style_tag   = STYLE_KEYWORDS.get(style, "")
    full_prompt = f"{prompt[:100]}, {style_tag}" if style_tag else prompt[:100]
    models      = ["stabilityai/stable-diffusion-2-1", "runwayml/stable-diffusion-v1-5"]
    headers     = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}
    for model in models:
        url     = f"https://api-inference.huggingface.co/models/{model}"
        payload = {"inputs": full_prompt, "parameters": {"width": 512, "height": 512, "num_inference_steps": 25}, "options": {"wait_for_model": True}}
        print(f"  HF: {model}")
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                r = await client.post(url, headers=headers, json=payload)
            if r.status_code == 200 and "image" in r.headers.get("content-type", ""):
                img_id = str(uuid.uuid4())
                (IMG_DIR / f"{img_id}.png").write_bytes(r.content)
                return f"http://localhost:8000/images/{img_id}.png"
            print(f"  HF {r.status_code}: {r.text[:100]}")
        except Exception as e:
            print(f"  HF error: {e}")
    raise Exception("All HF models failed")

async def generate_dalle(prompt: str, size: str, style: str) -> str:
    style_tag   = STYLE_KEYWORDS.get(style, "")
    full_prompt = f"{prompt}, {style_tag}" if style_tag else prompt
    url         = "https://api.openai.com/v1/images/generations"
    headers     = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
    payload     = {"model": "dall-e-3", "prompt": full_prompt, "n": 1, "size": size}
    async with httpx.AsyncClient(timeout=60) as client:
        r    = await client.post(url, headers=headers, json=payload)
        data = r.json()
    if r.status_code != 200: raise Exception(f"DALL-E: {data}")
    return data["data"][0]["url"]

@app.post("/generate")
async def generate(req: GenerateReq, user=Depends(get_current_user)):
    width, height = RATIO_SIZES.get(req.ratio, (512, 512))
    dalle_size    = "1024x1024" if req.ratio == "square" else ("1792x1024" if req.ratio == "landscape" else "1024x1792")

    print(f"\n{'='*50}")
    print(f"User: {user['name']} | Style: {req.style} | Ratio: {req.ratio}")
    print(f"Prompt: {req.prompt}")

    image_url = None

    if OPENAI_KEY and OPENAI_KEY.startswith("sk-"):
        try:
            print("Trying DALL-E 3...")
            image_url = await generate_dalle(req.prompt, dalle_size, req.style)
            print("✓ DALL-E")
        except Exception as e:
            print(f"✗ DALL-E: {e}")

    if not image_url and HF_TOKEN and HF_TOKEN.startswith("hf_"):
        try:
            print("Trying HuggingFace...")
            image_url = await generate_huggingface(req.prompt, width, height, req.style)
            print("✓ HuggingFace")
        except Exception as e:
            print(f"✗ HuggingFace: {e}")

    if not image_url:
        try:
            print("Trying Pollinations.ai...")
            image_url = await generate_pollinations(req.prompt, width, height, req.style)
            print("✓ Pollinations")
        except Exception as e:
            print(f"✗ Pollinations: {e}")
            raise HTTPException(503, f"Generation failed: {e}")

    print(f"Result: {image_url}\n{'='*50}")
    return {"image_url": image_url, "prompt": req.prompt, "style": req.style, "ratio": req.ratio}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)