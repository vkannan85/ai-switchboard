import SwiftUI

struct HistoryView:View {
    @EnvironmentObject var store:VocabularyStore
    @State private var search=""
    var filtered:[VocabularyWord] {
        let base=store.words.filter{$0.status != .new}
        return search.isEmpty ? base : base.filter{$0.word.localizedCaseInsensitiveContains(search)}
    }
    var body:some View {
        List(filtered){w in
            HStack {
                VStack(alignment:.leading){Text(w.word).font(.headline);Text("Week \(w.week) · Day \(w.day) · \(w.source.rawValue)").font(.caption).foregroundStyle(.secondary)}
                Spacer()
                Image(systemName:w.status == .known ? "checkmark.circle.fill":"arrow.clockwise.circle.fill").foregroundStyle(w.status == .known ? .green:.orange)
            }
        }.searchable(text:$search,prompt:"Find a word").navigationTitle("History")
    }
}
