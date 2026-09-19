import SwiftUI
import AVFoundation

struct TodayView:View {
    @EnvironmentObject var store:VocabularyStore
    private let speaker=AVSpeechSynthesizer()
    var items:[VocabularyWord]{store.dailyFive(week:store.selectedWeek,day:store.todayDay)}
    var body:some View {
        ScrollView {
            VStack(alignment:.leading,spacing:16) {
                Text("Daily 5").font(.largeTitle.bold())
                Text("2 school words + 3 Year 7 words").foregroundStyle(.secondary)
                Picker("Week",selection:$store.selectedWeek){ForEach(1...10,id:\.self){Text("Week \($0)").tag($0)}}.pickerStyle(.menu)
                ForEach(items){w in
                    VStack(alignment:.leading,spacing:10){
                        HStack{Text(w.word).font(.title2.bold());Spacer();Text(w.source.rawValue).font(.caption.bold()).padding(7).background((w.source == .school ? Color.orange : Color.indigo).opacity(.14)).clipShape(Capsule())}
                        if !w.meaning.isEmpty{Text(w.meaning)}
                        if !w.example.isEmpty{Text("“\(w.example)”").italic().foregroundStyle(.secondary)}
                        HStack{
                            Button{ speak(w.word) }label:{Label("Hear",systemImage:"speaker.wave.2.fill")}
                            Spacer()
                            Button("Practice"){store.set(w.id,.practice)}.buttonStyle(.bordered)
                            Button("Known"){store.set(w.id,.known)}.buttonStyle(.borderedProminent)
                        }
                    }.padding().background(.background).clipShape(RoundedRectangle(cornerRadius:20)).shadow(color:.black.opacity(.06),radius:8,y:3)
                }
                NavigationLink("Start fill-the-gap quiz →"){QuizView(words:items)}.buttonStyle(.borderedProminent)
            }.padding()
        }.navigationTitle("Vocabulary")
    }
    func speak(_ text:String){let u=AVSpeechUtterance(string:text);u.voice=AVSpeechSynthesisVoice(language:"en-GB");speaker.speak(u)}
}
