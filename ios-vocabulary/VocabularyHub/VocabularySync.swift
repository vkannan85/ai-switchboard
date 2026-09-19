import Foundation
#if canImport(Supabase)
import Supabase
#endif

@MainActor
final class VocabularySync:ObservableObject {
    @Published var signedIn=false
    @Published var message:String?
    #if canImport(Supabase)
    private var client:SupabaseClient? { SupabaseConfig.client }

    func restore() async {
        guard let client else{return}
        signedIn = client.auth.currentSession != nil
    }
    func signIn(email:String,password:String) async {
        guard let client else { message="Add Supabase configuration in Xcode first."; return }
        do { _ = try await client.auth.signIn(email:email,password:password); signedIn=true; message=nil }
        catch { message=error.localizedDescription }
    }
    func signOut() async {
        guard let client else{return}
        try? await client.auth.signOut(); signedIn=false
    }
    #else
    func restore() async {}
    func signIn(email:String,password:String) async { message="Supabase package is not installed yet." }
    func signOut() async {}
    #endif
}
