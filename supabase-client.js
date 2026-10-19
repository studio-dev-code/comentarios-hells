import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

export function createBackend() {
    if (
        !SUPABASE_URL.startsWith("https://") ||
        SUPABASE_URL.includes("COLE_") ||
        !SUPABASE_ANON_KEY ||
        SUPABASE_ANON_KEY.includes("COLE_")
    ) {
        throw new Error("Conexão pendente: configure a URL e a chave pública do Supabase.");
    }

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
