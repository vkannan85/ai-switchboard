import Foundation
#if canImport(Supabase)
import Supabase

enum SupabaseConfig {
    static var client:SupabaseClient? {
        guard let urlText=Bundle.main.object(forInfoDictionaryKey:"SUPABASE_URL") as? String,
              let key=Bundle.main.object(forInfoDictionaryKey:"SUPABASE_PUBLISHABLE_KEY") as? String,
              !urlText.isEmpty,!key.isEmpty,!urlText.contains("$("),
              let url=URL(string:urlText) else{return nil}
        return SupabaseClient(supabaseURL:url,supabaseKey:key)
    }
}
#endif
