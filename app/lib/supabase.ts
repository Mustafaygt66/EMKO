import { createClient } from '@supabase/supabase-js'

// Paylaştığın bilgilere göre güncellenmiş URL ve Key
const supabaseUrl = 'https://ligweftkpfmraogzzzmn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ3dlZnRrcGZtcmFvZ3p6em1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzEyMTgsImV4cCI6MjA4MzYwNzIxOH0.TjVB7bPjCQUqEpwgDBn60c5Hjya3CDASBzogdB_0TXE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Kullanıcı sayfayı yenileyince çıkış yapmasın
    autoRefreshToken: true, // Giriş anahtarını otomatik yenilesin
    detectSessionInUrl: true // URL'deki giriş kodunu (e-postadan gelen) otomatik yakalasın
  }
})