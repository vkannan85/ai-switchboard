import SwiftUI

@main
struct VocabularyHubApp: App {
    @StateObject private var store = VocabularyStore()
    var body: some Scene {
        WindowGroup { ContentView().environmentObject(store) }
    }
}
