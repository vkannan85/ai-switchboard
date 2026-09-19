import SwiftUI

struct WeeklyView: View {
    @EnvironmentObject var store: VocabularyStore
    var items:[VocabularyWord] { store.words.filter{$0.week == store.selectedWeek} }
    var body: some View {
        List {
            Picker("Week",selection:$store.selectedWeek){ ForEach(1...10,id:\.self){Text("Week \($0)").tag($0)} }
            ForEach(1...5,id:\.self){ d in
                Section("Day \(d)") {
                    ForEach(items.filter{$0.day == d}) { w in
                        HStack { Text(w.word); Spacer(); Image(systemName:w.status == .known ? "checkmark.circle.fill" : w.status == .practice ? "arrow.clockwise.circle.fill" : "circle").foregroundStyle(w.status == .known ? .green : .secondary) }
                    }
                }
            }
        }.navigationTitle("Weekly Recap")
    }
}
