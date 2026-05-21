import { useState, useCallback } from 'react';
import ParticleCanvas    from '../components/ParticleCanvas';
import FloatInput        from '../components/FloatInput';
import OTPInput          from '../components/OTPInput';
import PasswordStrength  from '../components/PasswordStrength';
import Button            from '../components/Button';
import Toast             from '../components/Toast';
import { api }           from '../utils/api';
import { useToast }      from '../hooks/useToast';
import { useTimer }      from '../hooks/useTimer';

export default function AuthPage({ onLogin }) {
  const [screen, setScreen] = useState('login');
  const [form, setForm]     = useState({ name:'', email:'', password:'', confirm:'' });
  const [otp, setOtp]       = useState('      ');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const { left, expired, restart } = useTimer(60);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (screen === 'signup') {
      if (!form.name.trim())                      e.name     = 'Name is required';
      if (!form.email)                            e.email    = 'Email is required';
      else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = 'Invalid email';
      if (!form.password)                         e.password = 'Password is required';
      else if (form.password.length < 8)          e.password = 'At least 8 characters';
      if (form.password !== form.confirm)         e.confirm  = "Passwords don't match";
    } else if (screen === 'login') {
      if (!form.email)    e.email    = 'Email is required';
      if (!form.password) e.password = 'Password is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const go = (s) => { setErrors({}); setOtp('      '); setScreen(s); };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/signup', { name: form.name, email: form.email, password: form.password });
      showToast('OTP sent to your email! Check your inbox.', 'success');
      restart(); go('otp');
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    const code = otp.replace(/\s/g, '');
    if (code.length !== 6) { showToast('Enter all 6 digits', 'error'); return; }
    setLoading(true);
    try {
      const data = await api.post('/auth/verify-otp', { email: form.email, otp: code });
      if (data.access_token) {
        localStorage.setItem('sm_token', data.access_token);
        showToast(`Welcome to SketchMind, ${data.user.name}! 🎉`, 'success');
        onLogin(data.user);
      }
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email: form.email, password: form.password });
      localStorage.setItem('sm_token', data.access_token);
      showToast(`Welcome back, ${data.user.name}! ✦`, 'success');
      onLogin(data.user);
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!form.email) { setErrors({ email: 'Email is required' }); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: form.email });
      showToast('Reset code sent if email exists.', 'success');
      restart(); go('reset');
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  const handleReset = async () => {
    const code = otp.replace(/\s/g, '');
    if (code.length !== 6) { showToast('Enter all 6 digits', 'error'); return; }
    if (!form.password)    { showToast('Enter a new password', 'error'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: form.email, otp: code, new_password: form.password });
      showToast('Password reset! Please log in.', 'success');
      go('login');
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email: form.email });
      showToast('New OTP sent!', 'success');
      restart(); setOtp('      ');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const Timer = () => (
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      {!expired
        ? <p style={{ color: '#64748b', fontSize: 14 }}>
            Expires in{' '}
            <span style={{ color: '#f59e0b', fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>
              {String(Math.floor(left/60)).padStart(2,'0')}:{String(left%60).padStart(2,'0')}
            </span>
          </p>
        : <button onClick={handleResend} style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:14, fontWeight:600 }}>
            Resend code
          </button>
      }
    </div>
  );

  const screens = {
    login: {
      title: 'Welcome back',
      sub:   'Sign in to continue creating',
      body: <>
        <FloatInput label="Email address" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        <FloatInput label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="current-password" />
        <div style={{ textAlign:'right', marginBottom:20, marginTop:-6 }}>
          <button onClick={() => go('forgot')} style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:13, fontWeight:500 }}>Forgot password?</button>
        </div>
        <Button onClick={handleLogin} loading={loading}>Sign in</Button>
        <p style={{ textAlign:'center', marginTop:20, color:'#64748b', fontSize:14 }}>
          No account?{' '}
          <button onClick={() => go('signup')} style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:14, fontWeight:600 }}>Create one</button>
        </p>
      </>,
    },
    signup: {
      title: 'Create account',
      sub:   'Start turning words into art',
      body: <>
        <FloatInput label="Your name"       value={form.name}     onChange={set('name')}     error={errors.name}     autoComplete="name" />
        <FloatInput label="Email address" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        <FloatInput label="Password" type="password"  value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
        <PasswordStrength password={form.password} />
        <FloatInput label="Confirm password" type="password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
        <Button onClick={handleSignup} loading={loading}>Create account &amp; send OTP</Button>
        <p style={{ textAlign:'center', marginTop:20, color:'#64748b', fontSize:14 }}>
          Have an account?{' '}
          <button onClick={() => go('login')} style={{ background:'none', border:'none', color:'#60a5fa', cursor:'pointer', fontSize:14, fontWeight:600 }}>Sign in</button>
        </p>
      </>,
    },
    otp: {
      title: 'Check your inbox',
      sub:   `We sent a 6-digit code to ${form.email}`,
      body: <>
        <div style={{ marginBottom: 20 }}><OTPInput value={otp} onChange={setOtp} disabled={loading} /></div>
        <Timer />
        <Button onClick={handleVerifyOTP} loading={loading}>Verify &amp; continue</Button>
        <p style={{ textAlign:'center', marginTop:14 }}>
          <button onClick={() => go('signup')} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>← Back</button>
        </p>
      </>,
    },
    forgot: {
      title: 'Reset password',
      sub:   'Enter your email to receive a reset code',
      body: <>
        <FloatInput label="Email address" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        <Button onClick={handleForgot} loading={loading}>Send reset code</Button>
        <p style={{ textAlign:'center', marginTop:14 }}>
          <button onClick={() => go('login')} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:13 }}>← Back to login</button>
        </p>
      </>,
    },
    reset: {
      title: 'New password',
      sub:   `Enter the code sent to ${form.email}`,
      body: <>
        <div style={{ marginBottom: 20 }}><OTPInput value={otp} onChange={setOtp} disabled={loading} /></div>
        <Timer />
        <FloatInput label="New password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
        <PasswordStrength password={form.password} />
        <Button onClick={handleReset} loading={loading}>Reset password</Button>
      </>,
    },
  };

  const s = screens[screen];

  return (
    <div style={{ minHeight:'100vh', background:'radial-gradient(ellipse 80% 60% at 50% 0%,#0f1e38 0%,#080810 60%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative' }}>
      <ParticleCanvas />
      <div style={{ position:'fixed', top:'8%',  left:'12%', width:420, height:420, background:'radial-gradient(circle,rgba(37,99,235,0.1) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'8%', right:'8%', width:360, height:360, background:'radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none', zIndex:0 }} />

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:440 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:40, height:40, background:'linear-gradient(135deg,#1e40af,#06b6d4)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 4px 20px rgba(59,130,246,0.4)' }}>✦</div>
            <span style={{ fontSize:24, fontWeight:900, color:'#f1f5f9', fontFamily:"'Syne',sans-serif", letterSpacing:'-0.5px' }}>SketchMind</span>
          </div>
          <p style={{ color:'#475569', fontSize:12, letterSpacing:'0.15em', textTransform:'uppercase', margin:0 }}>AI Text-to-Drawing</p>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(15,23,42,0.75)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:24, padding:'36px', boxShadow:'0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <h2 style={{ margin:'0 0 6px', fontSize:26, fontWeight:800, color:'#f1f5f9', fontFamily:"'Syne',sans-serif", letterSpacing:'-0.5px' }}>{s.title}</h2>
          <p style={{ margin:'0 0 26px', color:'#64748b', fontSize:14 }}>{s.sub}</p>
          {s.body}
        </div>

        <p style={{ textAlign:'center', marginTop:22, color:'#1e293b', fontSize:12 }}>
          By continuing you agree to our Terms &amp; Privacy Policy
        </p>
      </div>

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
