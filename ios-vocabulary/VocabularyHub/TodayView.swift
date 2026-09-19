import SwiftUI
import AVFoundation

struct TodayView: View {
    @EnvironmentObject var store: VocabularyStore
    private let speaker = AVSpeechSynthesizer()
    var day: Int { min(5, max(1, Calendar.current.component(.weekday, from: Date()) - 1)) }
    var items: [VocabularyWord] { Array(store.words.filter{$0.week == store.selectedWeek && $0.day == day}.prefix(5)) }

    var body: some View {
        ScrollView {
            VStack(alignment:.leading, spacing:16) {
                Text("Daily 5").font(.largeTitle.bold())
                Text("Small steps. Strong vocabulary.").foregroundStyle(.secondary)
                Picker("Week", selection:$store.selectedWeek) { ForEach(1...10,id:\.self){ Text("Week \($0)").tag($0) } }.pickerStyle(.menu)
                ForEach(items) { w in
                    VStack(alignment:.leading, spacing:10) {
                        HStack { Text(w.word).font(.title2.bold()); Spacer(); Text(w.source.rawValue).font(.caption.bold()).padding(7).background(.indigo.opacity(.12)).clipShape(Capsule()) }
                        if !w.meaning.isEmpty { Text(w.meaning) }
                        if !w.example.isEmpty { Text("“\(w.example)”").italic().foregroundStyle(.secondary) }
                        HStack {
                            Button { speak(w.word) } label: { Label("Hear",systemImage:"speaker.wave.2.fill") }
                            Spacer()
                            Button("Practice") { store.set(w.id,.practice) }.buttonStyle(.bordered)
                            Button("Known") { store.set(w.id,.known) }.buttonStyle(.borderedProminent)
                        }
                    }.padding().background(.background).clipShape(RoundedRectangle(cornerRadius:20)).shadow(color:.black.opacity(.06),radius:8,y:3)
                }
            }.padding()
        }.navigationTitle("Vocabulary")
    }
    func speak(_ text:String){ let u=AVSpeechUtterance(string:text); u.voice=AVSpeechSynthesisVoice(language:"en-GB"); speaker.speak(u) }
}
