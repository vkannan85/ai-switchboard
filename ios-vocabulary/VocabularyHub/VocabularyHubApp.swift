import SwiftUI

@main
struct VocabularyHubApp:App {
    @StateObject private var store=VocabularyStore()
    @StateObject private var sync=VocabularySync()
    var body:some Scene {
        WindowGroup {
            AppRootView().environmentObject(store).environmentObject(sync)
        }
    }
}
