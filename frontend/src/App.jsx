import { useState, useEffect } from 'react';
import AuthPage    from './pages/AuthPage';
import DrawPage    from './pages/DrawPage';
import GalleryPage from './pages/GalleryPage';
import Navbar      from './components/Navbar';

export default function App() {
  const [user, setUser]       = useState(null);
  const [page, setPage]       = useState('draw');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    const saved = localStorage.getItem('sm_user');
    if (token && saved) { try { setUser(JSON.parse(saved)); } catch {} }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('sm_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sm_token');
    localStorage.removeItem('sm_user');
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#08080f' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(59,130,246,0.2)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  );

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar user={user} page={page} setPage={setPage} onLogout={handleLogout} />
      <main style={{ paddingTop:64 }}>
        {page === 'draw'    && <DrawPage user={user} />}
        {page === 'gallery' && <GalleryPage user={user} />}
      </main>
    </div>
  );
}
