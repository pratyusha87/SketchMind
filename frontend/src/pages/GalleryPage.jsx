import { useState } from 'react';
import Button         from '../components/Button';
import Toast          from '../components/Toast';
import { useToast }   from '../hooks/useToast';
import { useGallery } from '../hooks/useGallery';

export default function GalleryPage({ user }) {
  const { images, removeImage, clearAll } = useGallery();
  const { toast, showToast, hideToast }   = useToast();
  const [selected, setSelected]           = useState(null);
  const [filter, setFilter]               = useState('all');

  const styles = ['all', ...new Set(images.map(i => i.style))];

  const filtered = filter === 'all' ? images : images.filter(i => i.style === filter);

  const handleDownload = async (img) => {
    try {
      const res  = await fetch(img.url);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `sketchmind-${img.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('Download failed','error'); }
  };

  const handleDelete = (id) => {
    removeImage(id);
    if (selected?.id === id) setSelected(null);
    showToast('Removed from gallery','info');
  };

  return (
    <div style={{ minHeight:'calc(100vh - 64px)', padding:'32px 36px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#f1f5f9', fontFamily:"'Syne',sans-serif", margin:'0 0 4px' }}>Your Gallery</h1>
          <p style={{ color:'#64748b', fontSize:14, margin:0 }}>{images.length} creation{images.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {/* Filter */}
          <div style={{ display:'flex', gap:6 }}>
            {styles.map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                background: filter === s ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filter === s ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius:8, padding:'5px 12px',
                color: filter === s ? '#60a5fa' : '#64748b',
                cursor:'pointer', fontSize:12, fontWeight:600,
                textTransform:'capitalize',
              }}>{s}</button>
            ))}
          </div>
          {images.length > 0 && (
            <Button variant="danger" onClick={() => { if(window.confirm('Clear all?')) clearAll(); }} style={{ width:'auto', padding:'7px 14px', fontSize:12 }}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'80px 20px', animation:'fadeIn 0.4s ease' }}>
          <div style={{ fontSize:64, marginBottom:16, opacity:0.2 }}>🖼</div>
          <p style={{ color:'#334155', fontSize:16, fontWeight:500 }}>
            {images.length === 0 ? 'No drawings yet' : 'No drawings in this style'}
          </p>
          <p style={{ color:'#1e293b', fontSize:13, marginTop:8 }}>
            {images.length === 0 ? 'Go to Draw and create your first masterpiece' : 'Try a different filter'}
          </p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
          {filtered.map(img => (
            <div key={img.id}
              onClick={() => setSelected(img)}
              style={{
                cursor:'pointer', borderRadius:16,
                overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)',
                background:'rgba(15,20,35,0.8)',
                transition:'transform 0.2s, box-shadow 0.2s',
                animation:'fadeIn 0.4s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}
            >
              <div style={{ position:'relative', aspectRatio:'1/1', overflow:'hidden' }}>
                <img src={img.url} alt={img.prompt} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:5 }}>
                  <button onClick={e => { e.stopPropagation(); handleDownload(img); }} style={{ background:'rgba(0,0,0,0.6)', border:'none', borderRadius:7, padding:'5px 7px', cursor:'pointer', color:'#fff', fontSize:13 }}>⬇</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(img.id); }} style={{ background:'rgba(0,0,0,0.6)', border:'none', borderRadius:7, padding:'5px 7px', cursor:'pointer', color:'#f87171', fontSize:13 }}>✕</button>
                </div>
              </div>
              <div style={{ padding:'12px 14px' }}>
                <p style={{ color:'#94a3b8', fontSize:12, lineHeight:1.4, margin:'0 0 6px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {img.prompt}
                </p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:6, padding:'2px 8px', fontSize:11, color:'#60a5fa', textTransform:'capitalize' }}>
                    {img.style}
                  </span>
                  <span style={{ color:'#334155', fontSize:11 }}>
                    {new Date(img.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position:'fixed', inset:0, zIndex:500,
          background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:24,
          animation:'fadeIn 0.2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'#0f1220', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:20, overflow:'hidden', maxWidth:700, width:'100%',
            maxHeight:'90vh', display:'flex', flexDirection:'column',
          }}>
            <img src={selected.url} alt={selected.prompt} style={{ width:'100%', objectFit:'contain', maxHeight:'60vh' }} />
            <div style={{ padding:'20px 24px' }}>
              <p style={{ color:'#94a3b8', fontSize:14, lineHeight:1.6, margin:'0 0 16px' }}>{selected.prompt}</p>
              <div style={{ display:'flex', gap:10 }}>
                <Button onClick={() => handleDownload(selected)} style={{ flex:1 }}>⬇ Download</Button>
                <Button variant="danger" onClick={() => handleDelete(selected.id)} style={{ flex:1 }}>🗑 Remove</Button>
                <button onClick={() => setSelected(null)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:13, padding:'0 16px', color:'#64748b', cursor:'pointer', fontSize:14 }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
