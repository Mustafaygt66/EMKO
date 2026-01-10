"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

// TypeScript Tipi (Hata almamak için)
interface Job {
  id: string;
  title: string;
  description: string;
  category: string | null;
  price_amount: number | null;
  status: string;
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal ve Form State'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", description: "", price_amount: "" });

  // İlanları Çekme Fonksiyonu
  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Hata:", error.message);
    } else {
      setJobs((data as Job[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Yeni İlan Kaydetme Fonksiyonu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("jobs").insert([
      { 
        title: newJob.title, 
        description: newJob.description, 
        price_amount: Number(newJob.price_amount),
        status: 'open' 
      }
    ]);

    if (error) {
      alert("Hata oluştu: " + error.message);
    } else {
      setIsModalOpen(false);
      setNewJob({ title: "", description: "", price_amount: "" });
      fetchJobs(); // Sayfayı yenilemeden listeyi güncelle
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-black text-orange-600 tracking-tighter italic">EMKO</h1>
            <p className="text-slate-500 font-bold ml-1">Batıkent Yardımlaşma Ağı</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95"
          >
            + İLAN VER
          </button>
        </header>

        {/* İLAN LİSTESİ */}
        <div className="grid gap-6">
          {loading ? (
            <div className="text-center p-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-4 text-slate-400 font-bold italic">Batıkent taranıyor...</p>
            </div>
          ) : jobs.length > 0 ? (
            jobs.map((job) => (
              <div 
                key={job.id} 
                className="group border-2 border-white p-8 rounded-[32px] shadow-sm bg-white hover:border-orange-200 hover:shadow-2xl transition-all duration-500"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full uppercase tracking-[0.2em]">
                      {job.category || 'DİĞER'}
                    </span>
                    <h2 className="text-3xl font-extrabold mt-4 text-slate-800 leading-none">{job.title}</h2>
                    <p className="text-slate-500 mt-3 text-lg font-medium leading-relaxed">{job.description}</p>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-3xl text-center min-w-[140px] group-hover:bg-orange-50 transition-colors">
                    <p className="text-3xl font-black text-emerald-600">
                      {job.price_amount ? `${job.price_amount}₺` : 'TAKAS'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 tracking-widest uppercase">BATIKENT / ANKARA</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-sm font-black text-slate-600 uppercase tracking-tight">
                      {job.status === 'open' ? 'İLAN AKTİF' : 'TAMAMLANDI'}
                    </span>
                  </div>
                  <button className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-black hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-200">
                    KOMŞUNA DESTEK OL
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-24 bg-white rounded-[40px] border-4 border-dashed border-slate-100">
              <p className="text-slate-300 text-xl font-bold">Henüz buralarda bir hareketlilik yok...</p>
            </div>
          )}
        </div>
      </div>

      {/* İLAN VERME MODALI (FORM) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-8 tracking-tight">Yeni İlan Oluştur</h2>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-400 ml-2 uppercase tracking-widest">Başlık</label>
                <input 
                  placeholder="Ne yardımı lazım?" 
                  className="p-5 bg-slate-100 rounded-[20px] outline-none focus:ring-4 ring-orange-100 font-bold transition-all"
                  onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-400 ml-2 uppercase tracking-widest">Açıklama</label>
                <textarea 
                  placeholder="Detayları buraya yaz komşun anlasın..." 
                  className="p-5 bg-slate-100 rounded-[20px] h-32 outline-none focus:ring-4 ring-orange-100 font-medium transition-all"
                  onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-400 ml-2 uppercase tracking-widest">Bütçe (TL)</label>
                <input 
                  type="number" 
                  placeholder="Kaç TL ödeyeceksin?" 
                  className="p-5 bg-slate-100 rounded-[20px] outline-none focus:ring-4 ring-orange-100 font-bold transition-all"
                  onChange={(e) => setNewJob({...newJob, price_amount: e.target.value})}
                  required
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 p-5 font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  İPTAL
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] p-5 bg-orange-600 text-white rounded-[24px] font-black shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all active:scale-95"
                >
                  YAYINLA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}