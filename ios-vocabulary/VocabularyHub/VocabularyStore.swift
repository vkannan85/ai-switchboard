import Foundation

@MainActor
final class VocabularyStore: ObservableObject {
    @Published var words:[VocabularyWord] { didSet { save() } }
    @Published var selectedWeek=1
    private let key="vocabulary.words.v2"

    init() {
        if let d=UserDefaults.standard.data(forKey:key), let saved=try? JSONDecoder().decode([VocabularyWord].self,from:d) { words=saved }
        else { words=Self.seed }
    }

    var todayDay:Int {
        let weekday=Calendar.current.component(.weekday,from:Date())
        return min(5,max(1,weekday-1))
    }
    func dailyFive(week:Int,day:Int)->[VocabularyWord] {
        let school=words.filter{$0.week==week && $0.day==day && $0.source == .school}.prefix(2)
        let extra=words.filter{$0.week==week && $0.day==day && $0.source == .year7}.prefix(3)
        return Array(school+extra)
    }
    func set(_ id:UUID,_ status:VocabularyWord.Status) {
        guard let i=words.firstIndex(where:{$0.id==id}) else{return}; words[i].status=status
    }
    func reset(){words=Self.seed}
    private func save(){if let d=try? JSONEncoder().encode(words){UserDefaults.standard.set(d,forKey:key)}}

    static let school:[[String]]=[
      ["context","trenches","predict","prediction","commandments","geography","physical","recycling","sustainability","design"],
      ["gradual","mesmerised","belfry","altar","private","sustainable","continent","technology","tenon","timber"],
      ["peaceful","sneering","defiance","poach","aeroplane","country","multicultural","try square","hardwood","softwood"],
      ["sentimental","adoration","frantic","frantically","propaganda","diversity","settlement","isometric","semibreve","rhythm"],
      ["respect","tension","drama","describe","description","deforestation","sketch","pace","chord","pitch"],
      ["coward","cowardice","military","injustice","conflict","refine","tertiary","characterisation","proxemics","devising"],
      ["patriot","patriotic","patriotism","recruit","recruitment","colour","texture","volume","pitch","tone"],
      ["remember","remembrance","Armistice","author","writer","graduated","printmaking","bacteria","enzymic","conduction"],
      ["pointillism","detail","photomontage","convection","radiation","hygiene","safety","measure","weigh","cross-contamination"],
      ["crotchet","quaver","decrepit","desolate","denigrate","derelict","demean","depravity","deride","deprivation"]
    ]
    static let year7=["analyse","contrast","significant","interpret","evidence","justify","sequence","evaluate","structure","consequence","relevant","perspective","method","factor","identify"]
    static let seed:[VocabularyWord] = {
        var out:[VocabularyWord]=[]
        for (wi,list) in school.enumerated() {
            for (i,w) in list.enumerated() { out.append(VocabularyWord(w,source:.school,week:wi+1,day:i/2+1)) }
            for day in 1...5 {
                for n in 0..<3 {
                    let w=year7[((wi*15)+(day-1)*3+n)%year7.count]
                    out.append(VocabularyWord(w,source:.year7,week:wi+1,day:day))
                }
            }
        }
        return out
    }()
}
