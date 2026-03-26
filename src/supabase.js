import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
<<<<<<< HEAD
    '[Dayjee] Supabase 환경변수가 설정되지 않았습니다.\n' +
=======
    '[NoJam] Supabase 환경변수가 설정되지 않았습니다.\n' +
>>>>>>> 028f647cb6777152179d040aa2d7623776063f9d
      '.env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해 주세요.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
