import SwiftUI

struct FlashcardsView: View {
    @EnvironmentObject var store: VocabularyStore
    @State private var index=0
    @State private var flipped=false
    var items:[VocabularyWord] { store.words.filter{$0.week == store.selectedWeek} }
    var body: some View {
        VStack(spacing:24) {
            HStack { Text("Week \(store.selectedWeek)").font(.headline); Spacer(); Text(items.isEmpty ? "0 / 0" : "\(index+1) / \(items.count)") }
            if !items.isEmpty {
                let w=items[min(index,items.count-1)]
                ZStack {
                    RoundedRectangle(cornerRadius:28).fill(flipped ? .indigo : .orange.gradient)
                    VStack(spacing:16) {
                        Text(flipped ? (w.meaning.isEmpty ? "Learn this word and add your own meaning." : w.meaning) : w.word)
                            .font(.largeTitle.bold()).multilineTextAlignment(.center).foregroundStyle(.white)
                        Text(flipped ? w.example : "Tap to reveal").foregroundStyle(.white.opacity(.8))
                    }.padding(30)
                }.frame(height:360).onTapGesture { withAnimation(.spring){ flipped.toggle() } }
                HStack {
                    Button("← Previous"){ index=max(0,index-1); flipped=false }.buttonStyle(.bordered)
                    Spacer()
                    Button("Next →"){ index=min(items.count-1,index+1); flipped=false }.buttonStyle(.borderedProminent)
                }
            }
            Spacer()
        }.padding().navigationTitle("Flashcards")
    }
}
