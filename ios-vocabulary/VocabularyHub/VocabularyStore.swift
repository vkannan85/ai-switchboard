import Foundation

@MainActor
final class VocabularyStore: ObservableObject {
    @Published var words: [VocabularyWord] { didSet { save() } }
    @Published var selectedWeek = 1
    private let key = "vocabulary.words.v1"

    init() {
        if let d = UserDefaults.standard.data(forKey: key), let saved = try? JSONDecoder().decode([VocabularyWord].self, from: d) { words = saved }
        else { words = Self.seed }
    }
    func set(_ id: UUID, _ status: VocabularyWord.Status) {
        guard let i = words.firstIndex(where: {$0.id == id}) else { return }; words[i].status = status
    }
    func reset() { words = Self.seed }
    private func save() { if let d = try? JSONEncoder().encode(words) { UserDefaults.standard.set(d, forKey: key) } }

    static let raw: [[String]] = [
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
    static let seed: [VocabularyWord] = raw.enumerated().flatMap { wi, list in
        list.enumerated().map { i, w in VocabularyWord(w, source: .school, week: wi+1, day: i/2+1) }
    }
}
