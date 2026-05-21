import os, random, string, time, smtplib, uuid, httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────
SECRET_KEY  = os.getenv("SECRET_KEY", "sketchmind-secret-change-in-prod")
ALGORITHM   = "HS256"
TOKEN_EXP   = 60 * 24  # 24 hours

SMTP_HOST   = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT   = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER   = os.getenv("SMTP_USER", "")
SMTP_PASS   = os.getenv("SMTP_PASS", "")
FROM_EMAIL  = os.getenv("FROM_EMAIL", SMTP_USER)

HF_TOKEN    = os.getenv("HF_TOKEN", "")          # Hugging Face API token
OPENAI_KEY  = os.getenv("OPENAI_API_KEY", "")    # OpenAI API key (DALL-E fallback)

# ── In-memory stores (replace with PostgreSQL in production) ───────────────
users_db: dict = {}    # email -> {name, hashed_password, verified}
otp_store: dict = {}   # email -> {otp, expires_at, purpose}

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(title="SketchMind API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

pwd_ctx  = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ── Helpers ─────────────────────────────────────────────────────────────────
def hash_pw(pw):        return pwd_ctx.hash(pw)
def verify_pw(p, h):   return pwd_ctx.verify(p, h)
def gen_otp(n=6):      return "".join(random.choices(string.digits, k=n))

def create_token(data, exp_minutes=TOKEN_EXP):
    payload = {**data, "exp": datetime.utcnow() + timedelta(minutes=exp_minutes)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def send_email(to, subject, html):
    if not SMTP_USER or not SMTP_PASS:
        print(f"\n{'='*50}\nDEV MODE – Email to: {to}\nSubject: {subject}\n{html}\n{'='*50}\n")
        return True
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"SketchMind <{FROM_EMAIL}>"
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.ehlo(); s.starttls(); s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(FROM_EMAIL, to, msg.as_string())
        return True
    except Exception as e:
        print(f"Email error: {e}"); return False

def otp_html(otp, name, purpose):
    action = "verify your email" if purpose == "signup" else "reset your password"
    return f"""<!DOCTYPE html><html><body style="margin:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#12121a,#1a1a2e);border-radius:20px;border:1px solid rgba(99,179,237,0.2);">
<tr><td style="background:linear-gradient(135deg,#1e3a5f,#2d6a9f);padding:36px 40px;text-align:center;border-radius:20px 20px 0 0;">
<div style="font-size:28px;font-weight:900;color:#fff;">✦ SketchMind</div>
<div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:4px;letter-spacing:3px;text-transform:uppercase;">AI Text-to-Drawing</div>
</td></tr>
<tr><td style="padding:40px;">
<p style="color:#cbd5e1;font-size:16px;margin:0 0 8px;">Hello <strong style="color:#93c5fd;">{name}</strong>,</p>
<p style="color:#94a3b8;font-size:15px;margin:0 0 32px;line-height:1.6;">Use the code below to {action}. It expires in <strong style="color:#f59e0b;">10 minutes</strong>.</p>
<div style="background:rgba(99,179,237,0.08);border:2px solid rgba(99,179,237,0.3);border-radius:16px;padding:28px;text-align:center;margin-bottom:32px;">
<div style="font-size:52px;font-weight:900;letter-spacing:14px;color:#60a5fa;font-family:'Courier New',monospace;">{otp}</div>
<div style="color:#64748b;font-size:11px;margin-top:8px;letter-spacing:2px;text-transform:uppercase;">One-Time Password</div>
</div>
<p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">If you didn't request this, safely ignore this email.</p>
</td></tr>
<tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
<p style="color:#334155;font-size:12px;margin:0;">© 2025 SketchMind. All rights reserved.</p>
</td></tr>
</table></td></tr></table></body></html>"""

# ── Auth Schemas ────────────────────────────────────────────────────────────
class SignupReq(BaseModel):       name:str; email:EmailStr; password:str
class VerifyOTPReq(BaseModel):    email:EmailStr; otp:str
class LoginReq(BaseModel):        email:EmailStr; password:str
class ResendReq(BaseModel):       email:EmailStr
class ForgotReq(BaseModel):       email:EmailStr
class ResetReq(BaseModel):        email:EmailStr; otp:str; new_password:str

# ── Generate Schema ─────────────────────────────────────────────────────────
class GenerateReq(BaseModel):
    prompt:          str
    negative_prompt: str   = ""
    style:           str   = "realistic"
    ratio:           str   = "square"

# ── Auth Routes ─────────────────────────────────────────────────────────────
@app.get("/health")
def health(): return {"status":"ok","service":"SketchMind API"}

@app.post("/auth/signup")
def signup(b: SignupReq):
    email = b.email.lower().strip()
    if email in users_db and users_db[email]["verified"]:
        raise HTTPException(400, "Email already registered.")
    users_db[email] = {"name":b.name, "hashed_password":hash_pw(b.password), "verified":False}
    otp = gen_otp()
    otp_store[email] = {"otp":otp, "expires_at":time.time()+600, "purpose":"signup"}
    if not send_email(email, "Your SketchMind verification code", otp_html(otp, b.name, "signup")):
        raise HTTPException(500, "Failed to send OTP.")
    return {"message":"OTP sent to your email."}

@app.post("/auth/verify-otp")
def verify_otp(b: VerifyOTPReq):
    email = b.email.lower().strip()
    if email not in otp_store: raise HTTPException(400, "No OTP found.")
    rec = otp_store[email]
    if time.time() > rec["expires_at"]: del otp_store[email]; raise HTTPException(400, "OTP expired.")
    if rec["otp"] != b.otp.strip():    raise HTTPException(400, "Incorrect OTP.")
    del otp_store[email]
    if rec["purpose"] == "signup":
        users_db[email]["verified"] = True
        token = create_token({"sub":email, "name":users_db[email]["name"]})
        return {"message":"Email verified!","access_token":token,"token_type":"bearer","user":{"email":email,"name":users_db[email]["name"]}}
    return {"message":"OTP verified.", "purpose":rec["purpose"]}

@app.post("/auth/resend-otp")
def resend_otp(b: ResendReq):
    email = b.email.lower().strip()
    if email not in users_db: raise HTTPException(404, "Email not found.")
    otp = gen_otp()
    otp_store[email] = {"otp":otp, "expires_at":time.time()+600, "purpose":otp_store.get(email,{}).get("purpose","signup")}
    send_email(email, "Your new SketchMind OTP", otp_html(otp, users_db[email]["name"], "signup"))
    return {"message":"New OTP sent."}

@app.post("/auth/login")
def login(b: LoginReq):
    email = b.email.lower().strip()
    if email not in users_db: raise HTTPException(401, "Invalid email or password.")
    u = users_db[email]
    if not u["verified"]:            raise HTTPException(403, "Email not verified.")
    if not verify_pw(b.password, u["hashed_password"]): raise HTTPException(401, "Invalid email or password.")
    token = create_token({"sub":email,"name":u["name"]})
    return {"access_token":token,"token_type":"bearer","user":{"email":email,"name":u["name"]}}

@app.post("/auth/forgot-password")
def forgot(b: ForgotReq):
    email = b.email.lower().strip()
    if email in users_db and users_db[email]["verified"]:
        otp = gen_otp()
        otp_store[email] = {"otp":otp,"expires_at":time.time()+600,"purpose":"reset"}
        send_email(email, "SketchMind password reset code", otp_html(otp, users_db[email]["name"],"reset"))
    return {"message":"If that email exists, a reset code was sent."}

@app.post("/auth/reset-password")
def reset_pw(b: ResetReq):
    email = b.email.lower().strip()
    if email not in otp_store or otp_store[email]["purpose"] != "reset":
        raise HTTPException(400, "No reset request found.")
    rec = otp_store[email]
    if time.time() > rec["expires_at"]: raise HTTPException(400, "OTP expired.")
    if rec["otp"] != b.otp.strip():     raise HTTPException(400, "Incorrect OTP.")
    del otp_store[email]
    users_db[email]["hashed_password"] = hash_pw(b.new_password)
    return {"message":"Password reset. You can now log in."}

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        p = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if not p.get("sub"): raise HTTPException(401, "Invalid token.")
        return {"email":p["sub"],"name":p.get("name")}
    except JWTError: raise HTTPException(401, "Invalid or expired token.")

@app.get("/auth/me")
def me(user=Depends(get_current_user)): return user

# ── Image Generation Route ──────────────────────────────────────────────────
STYLE_PROMPTS = {
    "realistic":  "photorealistic, highly detailed, professional photography, 8k",
    "watercolor": "watercolor painting, soft brushstrokes, artistic, colorful washes",
    "oil-paint":  "oil painting, thick brushstrokes, classical art, rich colors, canvas texture",
    "sketch":     "pencil sketch, hand-drawn, fine lines, graphite, artistic",
    "anime":      "anime style, vibrant, cel-shaded, Japanese animation",
    "fantasy":    "fantasy digital art, epic, magical, ethereal lighting, detailed",
    "cyberpunk":  "cyberpunk, neon lights, futuristic, dark atmosphere, sci-fi",
    "minimalist": "minimalist design, clean lines, simple, flat illustration, modern",
}

RATIO_SIZES = {
    "square":    (512, 512),
    "landscape": (768, 432),
    "portrait":  (432, 768),
}

async def generate_with_huggingface(prompt: str, width: int, height: int) -> str:
    """Generate image using Hugging Face Inference API (free tier available)."""
    model = "stabilityai/stable-diffusion-xl-base-1.0"
    url   = f"https://api-inference.huggingface.co/models/{model}"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    payload = {"inputs": prompt, "parameters": {"width": width, "height": height}}

    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(url, headers=headers, json=payload)
        if r.status_code != 200:
            raise HTTPException(500, f"HuggingFace error: {r.text[:200]}")
        # Save image and return URL (in prod: upload to S3/Cloudinary)
        img_id   = str(uuid.uuid4())
        img_path = f"/tmp/{img_id}.png"
        with open(img_path, "wb") as f:
            f.write(r.content)
        # Return a placeholder URL — in production serve from S3
        return f"https://picsum.photos/seed/{img_id}/{width}/{height}"  # replace with real URL

async def generate_with_dalle(prompt: str, size: str) -> str:
    """Generate image using OpenAI DALL-E 3."""
    url = "https://api.openai.com/v1/images/generations"
    headers = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
    payload = {"model": "dall-e-3", "prompt": prompt, "n": 1, "size": size, "quality": "standard"}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, headers=headers, json=payload)
        data = r.json()
        if r.status_code != 200:
            raise HTTPException(500, f"DALL-E error: {data}")
        return data["data"][0]["url"]

@app.post("/generate")
async def generate(req: GenerateReq, user=Depends(get_current_user)):
    style_suffix = STYLE_PROMPTS.get(req.style, "")
    full_prompt  = f"{req.prompt}, {style_suffix}"
    width, height = RATIO_SIZES.get(req.ratio, (512, 512))

    # DALL-E size string
    dalle_size = "1024x1024" if req.ratio == "square" else ("1792x1024" if req.ratio == "landscape" else "1024x1792")

    # Try DALL-E first, fallback to HuggingFace, fallback to placeholder
    if OPENAI_KEY:
        image_url = await generate_with_dalle(full_prompt, dalle_size)
    elif HF_TOKEN:
        image_url = await generate_with_huggingface(full_prompt, width, height)
    else:
        # Dev mode: return a placeholder image so UI works without API keys
        seed = abs(hash(req.prompt)) % 1000
        image_url = f"https://picsum.photos/seed/{seed}/{width}/{height}"

    return {
        "image_url": image_url,
        "prompt":    req.prompt,
        "style":     req.style,
        "ratio":     req.ratio,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
