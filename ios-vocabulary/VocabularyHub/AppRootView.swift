import SwiftUI

struct AppRootView:View {
    @EnvironmentObject var sync:VocabularySync
    var body:some View {
        Group { if sync.signedIn { ContentView() } else { SignInView() } }
            .task { await sync.restore() }
    }
}
