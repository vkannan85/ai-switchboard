import SwiftUI

struct ProgressViewScreen: View {
    @EnvironmentObject var store: VocabularyStore
    var known:Int { store.words.filter{$0.status == .known}.count }
    var practice:Int { store.words.filter{$0.status == .practice}.count }
    var body: some View {
        List {
            Section("Your progress") {
                LabeledContent("Words learned", value:"\(known)")
                LabeledContent("Need practice", value:"\(practice)")
                LabeledContent("Total school words", value:"\(store.words.count)")
                ProgressView(value:Double(known),total:Double(max(1,store.words.count)))
            }
            Section("Need Practice") { ForEach(store.words.filter{$0.status == .practice}) { Text($0.word) } }
            Section { Button("Reset progress",role:.destructive){store.reset()} }
        }.navigationTitle("Progress")
    }
}
