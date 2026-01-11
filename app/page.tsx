"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import Head from "next/head";

interface Job {
  id: string; title: string; description: string;
  price_amount: number | null; status: string; phone_number: string | null;
  is_featured: boolean; 
  featured_until: string | null;
  is_pending: boolean;
  likes_count: number; created_at: string; user_id: string;
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [view, setView] = useState<'all' | 'favorites' | 'my-jobs' | 'admin-pending'>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterType, setFilterType] = useState<'all' | 'featured' | 'normal'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showFakePaymentWarning, setShowFakePaymentWarning] = useState(false);
  const [selectedJobForBoost, setSelectedJobForBoost] = useState<Job | null>(null);
  const [newJob, setNewJob] = useState({ title: "", description: "", price_amount: "", phone_number: "" });

  const sliderRef = useRef<HTMLDivElement>(null);

  const ADMIN_EMAIL = "mustafaygt9002@gmail.com"; 
  const ADMIN_IBAN = "TR00 0000 0000 0000 0000 0000 00"; 
  const ADMIN_WA = "905511698146"; 

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const { scrollLeft, clientWidth } = sliderRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      sliderRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("jobs").select("*").order('created_at', { ascending: false });
    if (data) setJobs(data);
    setLoading(false);
  }, []);

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Bu ilanı tamamen kaldırmak istediğine emin misin?")) return;
    await supabase.from("favorites").delete().eq("job_id", jobId);
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) alert("Hata: " + error.message);
    else { alert("İlan başarıyla silindi."); fetchJobs(); }
  };

  const checkBanStatus = useCallback(async (userId: string) => {
    const { data } = await supabase.from("banned_users").select("user_id").eq("user_id", userId).maybeSingle();
    if (data) setIsBanned(true);
  }, []);

useEffect(() => {
    // Koyu modu zorunlu yap
    document.documentElement.classList.add('dark');

    // İlk kurulum verilerini çek
    const setup = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        await checkBanStatus(currentUser.id);
        const { data: favs } = await supabase.from("favorites").select("job_id").eq("user_id", currentUser.id);
        if (favs) setFavorites(favs.map(f => f.job_id));
      }
    };

    setup();
    fetchJobs();

    // Dinleyici: Giriş yapıldığında veya çıkış yapıldığında sayfayı yönet
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Kullanıcı giriş yaptığı an sayfayı yeniler, böylece "Giriş Yap" butonu gider
        // ve ilanlarım/favorilerim sekmeleri anında gelir.
        window.location.reload(); 
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setFavorites([]);
        setView('all');
      }
    });

    // Sayfa kapandığında dinleyiciyi temizle (Performans için önemli)
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchJobs, checkBanStatus]);

  const handleAdminAction = async (job: Job) => {
    const action = confirm("YÖNETİCİ SEÇENEĞİ:\n\nTAMAM: Sadece bu ilanı sil.\nİPTAL: Kullanıcıyı BANLA ve tüm ilanlarını sil!");
    if (action) { handleDeleteJob(job.id); } 
    else {
      const reallyBan = confirm("EMİN MİSİN? Bu kullanıcı yasaklanacak ve TÜM verileri silinecek.");
      if (reallyBan) {
        await supabase.from("favorites").delete().eq("user_id", job.user_id);
        await supabase.from("banned_users").insert([{ user_id: job.user_id }]);
        await supabase.from("jobs").delete().eq("user_id", job.user_id);
        alert("Kullanıcı yasaklandı!");
        fetchJobs();
      }
    }
  };

  const handleApproveBoost = async (job: Job) => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const { error } = await supabase.from("jobs").update({
      is_featured: true,
      is_pending: false,
      featured_until: nextWeek.toISOString()
    }).eq("id", job.id);
    if (!error) { alert("İlan onaylandı!"); fetchJobs(); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ 
      email: authEmail,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) alert(error.message);
    else { alert("Giriş bağlantısı gönderildi!"); setIsAuthModalOpen(false); }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setIsAuthModalOpen(true);
    let phone = newJob.phone_number.replace(/\s/g, '');
    if(phone.startsWith('0')) phone = phone.substring(1);
    if(!phone.startsWith('90')) phone = '90' + phone;

    const { error } = await supabase.from("jobs").insert([{ 
      ...newJob, 
      phone_number: phone, 
      price_amount: Number(newJob.price_amount), 
      status: 'open', 
      user_id: user.id,
      is_featured: false,
      is_pending: false 
    }]);
    if (!error) { setIsModalOpen(false); setNewJob({ title: "", description: "", price_amount: "", phone_number: "" }); fetchJobs(); }
  };

  const finalJobs = useMemo(() => {
    const now = new Date();
    let filtered = jobs.filter(j => {
      const isActuallyFeatured = j.is_featured && j.featured_until && new Date(j.featured_until) > now;
      const matchesSearch = j.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            j.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (view === 'admin-pending') return j.is_pending && matchesSearch;
      if (view === 'favorites') return favorites.includes(j.id) && matchesSearch;
      if (view === 'my-jobs') return j.user_id === user?.id && matchesSearch;
      if (filterType === 'featured') return isActuallyFeatured && matchesSearch;
      if (filterType === 'normal') return !isActuallyFeatured && !j.is_pending && matchesSearch;
      return !j.is_pending && matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "price_high") return (b.price_amount || 0) - (a.price_amount || 0);
      if (sortBy === "price_low") return (a.price_amount || 0) - (b.price_amount || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [jobs, searchTerm, sortBy, view, favorites, user, filterType]);

  const featuredJobs = useMemo(() => {
    const now = new Date();
    return jobs.filter(j => j.is_featured && j.featured_until && new Date(j.featured_until) > now);
  }, [jobs]);

  if (isBanned) return <div className="h-screen bg-black flex items-center justify-center text-white font-black text-3xl italic uppercase">ERİŞİM ENGELLENDİ 🚫</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans pb-20 overflow-x-hidden">
      <Head>
        <title>EMKO | Mutek Tech</title>
        <link rel="shortcut icon" href="/logom.ico" type="image/x-icon" />
      </Head>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .slider-content { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; gap: 1rem; width: 100%; }
        .slider-card { flex: 0 0 100%; scroll-snap-align: start; }
      `}</style>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 bg-[#0f172a] p-8 rounded-[40px] border border-[#1e293b] gap-6 shadow-2xl">
          <div onClick={() => { setView('all'); setSearchTerm(""); setFilterType('all'); }} className="cursor-pointer group active:scale-95 transition-all text-center">
            <h1 className="text-6xl font-black text-orange-600 italic tracking-tighter leading-none">EMKO</h1>
            <p className="text-[10px] text-slate-300 font-black tracking-[0.3em] uppercase mt-1">Mutek Tech</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4">
            {user?.email === ADMIN_EMAIL && (
              <button onClick={() => setView('admin-pending')} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase border-2 ${view === 'admin-pending' ? 'bg-red-600 border-red-600' : 'border-red-600 text-red-600'}`}>
                ONAY BEKLEYENLER ({jobs.filter(j => j.is_pending).length})
              </button>
            )}
            {user && (
              <>
                <button onClick={() => setView('my-jobs')} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase ${view === 'my-jobs' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200'}`}>İLANLARIM</button>
                <button onClick={() => setView('favorites')} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase ${view === 'favorites' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-200'}`}>KAYDETTİKLERİM</button>
              </>
            )}
            <button onClick={() => user ? setIsModalOpen(true) : setIsAuthModalOpen(true)} className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black hover:scale-105 transition-all shadow-xl text-xs uppercase">+ İLAN VER</button>
            {user && <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-[10px] font-black text-red-500 uppercase ml-2">Çıkış</button>}
          </div>
        </header>

        {/* TREND SLIDER */}
        {view === 'all' && featuredJobs.length > 0 && (
          <section className="mb-12 relative group">
            <div className="relative flex items-center">
              <button onClick={() => scrollSlider('left')} className="absolute -left-4 z-20 bg-white/10 hover:bg-orange-600 p-4 rounded-full backdrop-blur-md hidden md:block">←</button>
              <div ref={sliderRef} className="slider-content no-scrollbar px-1">
                {featuredJobs.map(job => (
                  <div key={job.id} className="slider-card">
                    <div className="bg-gradient-to-br from-orange-600/30 via-[#0f172a] to-orange-900/10 border-4 border-orange-600 p-10 rounded-[50px] shadow-2xl relative h-full">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-orange-600 rounded-full animate-ping"></span>
                        <span className="text-[10px] font-black text-orange-500 tracking-[0.3em] uppercase italic">TREND İLAN 🔥</span>
                      </div>
                      <h4 className="text-4xl font-black italic uppercase text-white tracking-tighter leading-none mb-6">{job.title}</h4>
                      <div className="flex justify-between items-end mt-12">
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Başlangıç Fiyatı</p>
                          <span className="text-4xl font-black text-emerald-400">{job.price_amount}₺</span>
                        </div>
                        <button onClick={() => window.open(`https://wa.me/${job.phone_number}`, '_blank')} className="bg-white text-black px-10 py-5 rounded-3xl font-black text-xs uppercase hover:bg-orange-600 hover:text-white transition-all shadow-xl">WHATSAPP İLE SOR</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => scrollSlider('right')} className="absolute -right-4 z-20 bg-white/10 hover:bg-orange-600 p-4 rounded-full backdrop-blur-md hidden md:block">→</button>
            </div>
            <p className="text-center text-[8px] text-slate-500 font-black mt-4 uppercase tracking-[.4em] md:hidden">KAYDIRARAK GÖZ AT ← →</p>
          </section>
        )}

        {/* FİLTRELER */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="bg-[#0f172a] p-4 rounded-[32px] border border-[#1e293b] flex flex-col md:flex-row gap-4 shadow-xl">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="İlanlarda ara..." className="flex-1 bg-[#020617] border-2 border-[#1e293b] rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-orange-600 transition-all" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-[#020617] border-2 border-[#1e293b] rounded-2xl px-4 py-4 text-xs font-black uppercase text-slate-300 outline-none cursor-pointer">
              <option value="newest">En Yeni</option>
              <option value="price_high">En Pahalı</option>
              <option value="price_low">En Ucuz</option>
            </select>
          </div>
          <div className="flex justify-center md:justify-start gap-3 px-2">
            <button onClick={() => setFilterType('all')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${filterType === 'all' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>TÜMÜ</button>
            <button onClick={() => setFilterType('featured')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${filterType === 'featured' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>VİTRİN 🔥</button>
            <button onClick={() => setFilterType('normal')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${filterType === 'normal' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>NORMAL</button>
          </div>
        </div>

        {/* İLAN LİSTESİ */}
        <div className="grid gap-8">
          {loading ? (
            <div className="text-center py-24 font-black text-slate-600 text-xl italic animate-pulse">Yükleniyor...</div>
          ) : finalJobs.length > 0 ? (
            finalJobs.map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                user={user} 
                favorites={favorites}
                isOwner={job.user_id === user?.id} 
                isAdmin={user?.email === ADMIN_EMAIL}
                toggleFavorite={(id: string) => {
                  if (!user) return setIsAuthModalOpen(true);
                  if (favorites.includes(id)) {
                    supabase.from("favorites").delete().eq("user_id", user.id).eq("job_id", id);
                    setFavorites(prev => prev.filter(fid => fid !== id));
                  } else {
                    supabase.from("favorites").insert([{ user_id: user.id, job_id: id }]);
                    setFavorites(prev => [...prev, id]);
                  }
                }}
                onDelete={() => handleDeleteJob(job.id)}
                onAdminAction={() => handleAdminAction(job)}
                onApprove={() => handleApproveBoost(job)}
                onBoostClick={() => { setSelectedJobForBoost(job); setIsPaymentModalOpen(true); }}
                onContact={() => window.open(`https://wa.me/${job.phone_number}`, '_blank')}
              />
            ))
          ) : (
            <div className="text-center py-24 bg-[#0f172a] rounded-[40px] border border-dashed border-[#1e293b]">
              <p className="text-slate-500 font-black uppercase italic">İlan bulunamadı.</p>
            </div>
          )}
        </div>
      </div>

      {/* ÖDEME MODALI - WHATSAPP MESAJI DÜZELTİLDİ */}
      {isPaymentModalOpen && selectedJobForBoost && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[110]">
          <div className="bg-[#0f172a] p-8 rounded-[40px] w-full max-w-md border-2 border-orange-600 shadow-2xl relative">
            {!showFakePaymentWarning ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">VİTRİNE ÇIKART</h2>
                  <p className="text-[10px] text-slate-400 font-black mt-3 uppercase tracking-widest">100 ₺ / 7 GÜN</p>
                </div>
                <div className="bg-[#020617] p-6 rounded-3xl border border-[#1e293b] mb-6 text-center">
                  <p className="text-[9px] text-slate-400 uppercase font-black mb-2">IBAN (Tıkla Kopyala)</p>
                  <p onClick={() => {navigator.clipboard.writeText(ADMIN_IBAN); alert("Kopyalandı!");}} className="text-sm font-mono font-bold text-white break-all cursor-pointer bg-slate-800 p-3 rounded-xl">{ADMIN_IBAN}</p>
                  <p className="text-[12px] text-orange-500 mt-6 font-black uppercase italic">Açıklama: #{selectedJobForBoost.id.split('-')[0].toUpperCase()}</p>
                </div>
                <button onClick={() => setShowFakePaymentWarning(true)} className="w-full p-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-sm shadow-xl">ÖDEMEYİ YAPTIM ✅</button>
                <button onClick={() => setIsPaymentModalOpen(false)} className="w-full mt-4 text-[10px] font-black text-slate-500 uppercase">VAZGEÇ</button>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-600 animate-pulse"><span className="text-4xl">⚠️</span></div>
                <h3 className="text-2xl font-black text-red-600 uppercase mb-4 italic tracking-tighter">GÜVENLİK KONTROLÜ</h3>
                <p className="text-xs text-slate-200 font-bold leading-relaxed uppercase mb-8">Ödemeyi yapmadan "Onaylıyorum" derseniz, hesabınız <span className="text-red-500">BANLANIR</span>.</p>
                <div className="grid gap-4">
                  <button onClick={async () => { 
                    await supabase.from("jobs").update({ is_pending: true }).eq("id", selectedJobForBoost.id);
                    const jobCode = selectedJobForBoost.id.split('-')[0].toUpperCase();
                    const waMsg = `Ödeme yapıldı: #${jobCode} (${selectedJobForBoost.title}) - Onay bekliyorum.`;
                    window.open(`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(waMsg)}`, '_blank');
                    setIsPaymentModalOpen(false);
                    setShowFakePaymentWarning(false);
                    fetchJobs();
                  }} className="w-full p-5 bg-white text-black rounded-[22px] font-black uppercase text-xs">ÖDEMEYİ YAPTIM, ONAYLIYORUM</button>
                  <button onClick={() => { setShowFakePaymentWarning(false); setIsPaymentModalOpen(false); }} className="w-full p-4 bg-slate-800 text-slate-400 rounded-[22px] font-black uppercase text-[10px]">İPTAL</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* İLAN PAYLAŞ MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[90]">
          <div className="bg-[#0f172a] p-10 rounded-[40px] w-full max-w-md border border-[#1e293b] shadow-2xl">
            <h2 className="text-4xl font-black mb-8 italic text-orange-600 uppercase text-center tracking-tighter">İlan Paylaş</h2>
            <form onSubmit={handleCreateJob} className="grid gap-5">
              <input placeholder="Başlık" className="w-full p-5 bg-[#020617] border-2 border-[#1e293b] rounded-[24px] text-sm text-white outline-none" onChange={(e) => setNewJob({...newJob, title: e.target.value})} required />
              <textarea placeholder="Detaylar..." className="w-full p-5 bg-[#020617] border-2 border-[#1e293b] rounded-[24px] h-36 text-sm text-white outline-none" onChange={(e) => setNewJob({...newJob, description: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Fiyat (₺)" className="w-full p-5 bg-[#020617] border-2 border-[#1e293b] rounded-[24px] text-sm text-white" onChange={(e) => setNewJob({...newJob, price_amount: e.target.value})} required />
                <input type="text" maxLength={10} placeholder="Tel (5xx xxx xx xx)" className="w-full p-5 bg-[#020617] border-2 border-[#1e293b] rounded-[24px] text-sm text-white" onChange={(e) => setNewJob({...newJob, phone_number: e.target.value})} required />
              </div>
              <button type="submit" className="w-full p-5 bg-orange-600 text-white rounded-[24px] font-black uppercase">YAYINLA</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-[10px] font-black text-slate-500 uppercase">VAZGEÇ</button>
            </form>
          </div>
        </div>
      )}

      {/* GİRİŞ MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-[#0f172a] p-10 rounded-[40px] w-full max-w-sm border border-[#1e293b] text-center shadow-2xl">
            <h2 className="text-4xl font-black mb-6 text-orange-600 uppercase italic">GİRİŞ YAP</h2>
            <form onSubmit={handleLogin} className="grid gap-4">
              <input type="email" placeholder="E-posta..." className="w-full p-5 bg-[#020617] border-2 border-[#1e293b] rounded-[22px] text-sm text-white outline-none" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
              <button type="submit" className="p-5 bg-orange-600 text-white rounded-[22px] font-black uppercase">BAĞLANTI GÖNDER</button>
              <button type="button" onClick={() => setIsAuthModalOpen(false)} className="text-[10px] font-black text-slate-500 uppercase">KAPAT</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, toggleFavorite, favorites, onContact, isOwner, isAdmin, onDelete, onBoostClick, onAdminAction, onApprove }: any) {
  return (
    <div className={`group relative bg-[#0f172a] border-2 p-10 rounded-[50px] transition-all duration-300 shadow-xl overflow-hidden
      ${job.is_featured ? 'border-orange-600 bg-orange-600/5' : 'border-[#1e293b]'}`}>
      
      {job.is_featured && (
        <div className="flex items-center gap-2 mb-6 bg-orange-600/20 border border-orange-600/30 w-fit px-4 py-2 rounded-2xl">
          <span className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black text-orange-500 uppercase italic tracking-widest">VİTRİN 🔥</span>
        </div>
      )}
      
      <button onClick={() => toggleFavorite(job.id)} className="absolute top-10 right-10 text-3xl hover:scale-125 transition-transform z-10">
        {favorites.includes(job.id) ? '🧡' : '🤍'}
      </button>

      <div className="flex flex-col gap-6">
        <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white group-hover:text-orange-500 transition-colors leading-tight">
          {job.title}
        </h3>
        <p className="text-slate-200 text-sm leading-relaxed font-medium bg-[#020617]/50 p-5 rounded-[30px] border border-[#1e293b]">
          {job.description}
        </p>

        <div className="mt-4 pt-8 border-t border-slate-800 flex flex-col gap-4">
          <div className="flex justify-between items-center">
             <p className="text-4xl font-black text-emerald-400 tracking-tighter">{job.price_amount}₺</p>
             <button onClick={onContact} className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-black text-[11px] uppercase shadow-xl hover:bg-orange-600 hover:text-white transition-all">
               WHATSAPP
             </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {isOwner && !job.is_featured && !job.is_pending && (
              <button onClick={onBoostClick} className="bg-orange-600/20 text-orange-500 border border-orange-600/50 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-orange-600 hover:text-white transition-all">
                VİTRİNE ÇIKART 🔥
              </button>
            )}
            {(isOwner || isAdmin) && (
              <button onClick={onDelete} className="bg-red-600/20 text-red-500 border border-red-600/50 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">
                İLANIMI SİL 🗑️
              </button>
            )}
            {isAdmin && job.is_pending && (
              <button onClick={onApprove} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                ÖDEMEYİ ONAYLA ✅
              </button>
            )}
            {isAdmin && (
              <button onClick={onAdminAction} className="bg-slate-800 text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase italic">
                ADMİN KONTROL
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}