import { createClient } from "@supabase/supabase-js";

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const getSupabaseUrl = (url: string) => {
  const parsedUrl = new URL(url);
  const dashboardProject = parsedUrl.pathname.match(/^\/dashboard\/project\/([^/]+)/);

  if (parsedUrl.hostname === "supabase.com" && dashboardProject) {
    return `https://${dashboardProject[1]}.supabase.co`;
  }

  return url.replace(/\/+$/, "");
};

if (!configuredSupabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

const supabaseUrl = getSupabaseUrl(configuredSupabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);