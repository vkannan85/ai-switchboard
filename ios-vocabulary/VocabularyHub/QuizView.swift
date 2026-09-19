import SwiftUI

struct QuizView:View {
    let words:[VocabularyWord]
    @EnvironmentObject var store:VocabularyStore
    @State private var index=0
    @State private var answer=""
    @State private var message=""
    var body:some View {
        VStack(spacing:22){
            if words.isEmpty { ContentUnavailableView("No words today",systemImage:"text.book.closed") }
            else {
                let w=words[min(index,words.count-1)]
                Text("Fill the gap").font(.largeTitle.bold())
                Text(w.fillBlank.isEmpty ? "Type today's word: \(String(repeating:"_",count:max(4,w.word.count)))" : w.fillBlank).font(.title3).multilineTextAlignment(.center)
                TextField("Your answer",text:$answer).textFieldStyle(.roundedBorder).textInputAutocapitalization(.never)
                Button("Check"){
                    if answer.trimmingCharacters(in:.whitespacesAndNewlines).caseInsensitiveCompare(w.word) == .orderedSame {
                        message="Correct ✓"; store.set(w.id,.known)
                    } else { message="Try again"; store.set(w.id,.practice) }
                }.buttonStyle(.borderedProminent)
                Text(message).font(.headline)
                if message=="Correct ✓" && index < words.count-1 { Button("Next word"){index+=1;answer="";message=""} }
                Spacer()
            }
        }.padding().navigationTitle("Quick Quiz")
    }
}
