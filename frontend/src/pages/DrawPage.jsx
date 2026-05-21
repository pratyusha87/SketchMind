import { useState, useRef } from 'react';
import Button       from '../components/Button';
import Toast        from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useGallery } from '../hooks/useGallery';
import { api }      from '../utils/api';

const STYLES = [
  { id:'realistic',   label:'Realistic',   emoji:'📷' },
  { id:'watercolor',  label:'Watercolor',  emoji:'🎨' },
  { id:'oil-paint',   label:'Oil Paint',   emoji:'🖼' },
  { id:'sketch',      label:'Sketch',      emoji:'✏️' },
  { id:'anime',       label:'Anime',       emoji:'⛩' },
  { id:'fantasy',     label:'Fantasy',     emoji:'🧙' },
  { id:'cyberpunk',   label:'Cyberpunk',   emoji:'🤖' },
  { id:'minimalist',  label:'Minimalist',  emoji:'⬜' },
];

const RATIOS = [
  { id:'square',    label:'1:1',  w:512, h:512  },
  { id:'landscape', label:'16:9', w:768, h:432  },
  { id:'portrait',  label:'9:16', w:432, h:768  },
];

const EXAMPLE_PROMPTS = [
  'A lonely lighthouse on a stormy sea at midnight',
  'A futuristic city floating among the clouds at dusk',
  'A fox reading a book under a cherry blossom tree',
  'An underwater kingdom with glowing coral and fish',
  'A dragon curled around a medieval castle in winter',
];

export default function DrawPage({ user }) {
  const [prompt, setPrompt]       = useState('');
  const [negative, setNegative]   = useState('');
  const [style, setStyle]         = useState('realistic');
  const [ratio, setRatio]         = useState('square');
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState(null);  // { url, prompt, style }
  const [showAdv, setShowAdv]     = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const { addImage } = useGallery();
  const progressRef = useRef(null);

  const fakeProgress = () => {
    setProgress(0);
    let p = 0;
    progressRef.current = setInterval(() => {
      p += Math.random() * 8 + 2;
      if (p >= 90) { clearInterval(progressRef.current); p = 90; }
      setProgress(Math.min(p, 90));
    }, 300);
  };

  const stopProgress = () => {
    clearInterval(progressRef.current);
    setProgress(100);
    setTimeout(() => setProgress(0), 800);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { showToast('Please enter a prompt first', 'warning'); return; }
    setLoading(true);
    setResult(null);
    fakeProgress();
    try {
      const data = await api.post('/generate', {
        prompt: prompt.trim(),
        negative_prompt: negative.trim(),
        style,
        ratio,
      });
      stopProgress();
      const item = {
        id:        Date.now(),
        url:       data.image_url,
        prompt:    prompt.trim(),
        style,
        ratio,
        createdAt: new Date().toISOString(),
      };
      setResult(item);
      addImage(item);
      showToast('Image generated!', 'success');
    } catch (err) {
      stopProgress();
      showToast(err.message, 'error');
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!result?.url) return;
    const res  = await fetch(result.url);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sketchmind-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    setResult(null);
    handleGenerate();
  };

  return (
    <div style={{ minHeight:'calc(100vh - 64px)', display:'flex', flexDirection:'column' }}>
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'420px 1fr', gap:0, minHeight:'calc(100vh - 64px)' }}>

        {/* ── LEFT PANEL: controls ── */}
        <div style={{ background:'rgba(12,16,28,0.9)', borderRight:'1px solid rgba(255,255,255,0.06)', padding:'28px 28px', overflowY:'auto', display:'flex', flexDirection:'column', gap:24 }}>

          {/* Greeting */}
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', fontFamily:"'Syne',sans-serif", margin:'0 0 4px' }}>
              What shall we draw today?
            </h1>
            <p style={{ color:'#64748b', fontSize:13, margin:0 }}>Describe your imagination — AI does the rest</p>
          </div>

          {/* Prompt */}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#60a5fa', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
              Your prompt
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. A lonely lighthouse on a stormy sea at midnight..."
              rows={4}
              style={{
                width:'100%', background:'rgba(255,255,255,0.03)',
                border:'1.5px solid rgba(255,255,255,0.1)',
                borderRadius:13, padding:'14px 15px', color:'#f1f5f9',
                fontSize:14, lineHeight:1.6, resize:'vertical', outline:'none',
                transition:'border-color 0.2s', boxSizing:'border-box',
              }}
              onFocus={e => e.target.style.borderColor='rgba(96,165,250,0.6)'}
              onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}
            />
            <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:6 }}>
              {EXAMPLE_PROMPTS.map(p => (
                <button key={p} onClick={() => setPrompt(p)} style={{
                  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:8, padding:'4px 10px', color:'#64748b',
                  cursor:'pointer', fontSize:11, transition:'all 0.2s',
                }}>{p.slice(0, 28)}…</button>
              ))}
            </div>
          </div>

          {/* Art style */}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#60a5fa', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>
              Art style
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)} style={{
                  background: style === s.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${style === s.id ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius:10, padding:'10px 4px',
                  color: style === s.id ? '#60a5fa' : '#94a3b8',
                  cursor:'pointer', fontSize:11, fontWeight:600,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  transition:'all 0.2s',
                }}>
                  <span style={{ fontSize:18 }}>{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio */}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#60a5fa', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>
              Aspect ratio
            </label>
            <div style={{ display:'flex', gap:8 }}>
              {RATIOS.map(r => (
                <button key={r.id} onClick={() => setRatio(r.id)} style={{
                  flex:1,
                  background: ratio === r.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${ratio === r.id ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius:10, padding:'12px 8px',
                  color: ratio === r.id ? '#60a5fa' : '#94a3b8',
                  cursor:'pointer', fontSize:12, fontWeight:600,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  transition:'all 0.2s',
                }}>
                  <div style={{
                    width: r.id==='portrait' ? 14 : r.id==='landscape' ? 24 : 18,
                    height: r.id==='portrait' ? 24 : r.id==='landscape' ? 14 : 18,
                    border:`2px solid ${ratio===r.id ? '#60a5fa' : '#475569'}`,
                    borderRadius:3,
                  }} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <div>
            <button onClick={() => setShowAdv(v => !v)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0 }}>
              <span style={{ transform: showAdv ? 'rotate(90deg)' : 'none', transition:'transform 0.2s', display:'inline-block' }}>▶</span>
              Advanced options
            </button>
            {showAdv && (
              <div style={{ marginTop:12 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#64748b', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
                  Negative prompt (what to exclude)
                </label>
                <textarea
                  value={negative}
                  onChange={e => setNegative(e.target.value)}
                  placeholder="e.g. blurry, ugly, text, watermark..."
                  rows={2}
                  style={{
                    width:'100%', background:'rgba(255,255,255,0.03)',
                    border:'1.5px solid rgba(255,255,255,0.08)',
                    borderRadius:10, padding:'10px 12px', color:'#94a3b8',
                    fontSize:13, lineHeight:1.5, resize:'none', outline:'none',
                    boxSizing:'border-box',
                  }}
                />
              </div>
            )}
          </div>

          {/* Generate button */}
          <div style={{ marginTop:'auto' }}>
            {progress > 0 && progress < 100 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Generating…</span>
                  <span style={{ fontSize:12, color:'#60a5fa', fontFamily:"'Space Mono',monospace" }}>{Math.round(progress)}%</span>
                </div>
                <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:99 }}>
                  <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#1e40af,#06b6d4)', borderRadius:99, transition:'width 0.3s' }} />
                </div>
              </div>
            )}
            <Button onClick={handleGenerate} loading={loading} style={{ fontSize:16, padding:'16px 24px' }}>
              ✦ Generate Drawing
            </Button>
          </div>
        </div>

        {/* ── RIGHT PANEL: result ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40, background:'rgba(8,10,20,0.6)', position:'relative' }}>
          {!result && !loading && (
            <div style={{ textAlign:'center', animation:'fadeIn 0.5s ease' }}>
              <div style={{ fontSize:80, marginBottom:20, opacity:0.2 }}>🎨</div>
              <p style={{ color:'#334155', fontSize:16, fontWeight:500 }}>Your drawing will appear here</p>
              <p style={{ color:'#1e293b', fontSize:13, marginTop:8 }}>Describe something and hit Generate</p>
            </div>
          )}

          {loading && (
            <div style={{ textAlign:'center', animation:'fadeIn 0.4s ease' }}>
              <div style={{ width:60, height:60, border:'3px solid rgba(59,130,246,0.15)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.9s linear infinite', margin:'0 auto 20px' }} />
              <p style={{ color:'#60a5fa', fontSize:15, fontWeight:600 }}>Creating your masterpiece…</p>
              <p style={{ color:'#334155', fontSize:13, marginTop:6 }}>This usually takes 10–20 seconds</p>
            </div>
          )}

          {result && (
            <div style={{ width:'100%', maxWidth:600, animation:'fadeIn 0.5s ease' }}>
              {/* Image */}
              <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 24px 60px rgba(0,0,0,0.5)', marginBottom:20 }}>
                <img
                  src={result.url}
                  alt={result.prompt}
                  style={{ width:'100%', display:'block', objectFit:'cover' }}
                />
              </div>

              {/* Prompt shown */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
                <p style={{ color:'#94a3b8', fontSize:13, margin:0, lineHeight:1.5 }}>
                  <span style={{ color:'#475569', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Prompt: </span>
                  {result.prompt}
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display:'flex', gap:10 }}>
                <Button onClick={handleDownload} style={{ flex:1 }}>⬇ Download</Button>
                <Button onClick={handleRegenerate} variant="ghost" style={{ flex:1 }}>🔄 Regenerate</Button>
                <button onClick={() => { navigator.clipboard.writeText(result.url); showToast('Link copied!','success'); }} style={{
                  background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:13, padding:'0 16px', color:'#94a3b8', cursor:'pointer', fontSize:18,
                }}>🔗</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
