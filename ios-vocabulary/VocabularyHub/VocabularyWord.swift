import Foundation

struct VocabularyWord: Identifiable, Codable, Hashable {
    let id: UUID
    let word: String
    let meaning: String
    let example: String
    let source: Source
    let week: Int
    let day: Int
    var status: Status

    enum Source: String, Codable { case school = "School", year7 = "Year 7" }
    enum Status: String, Codable { case new, known, practice = "Need Practice" }

    init(_ word: String, meaning: String = "", example: String = "", source: Source = .school, week: Int, day: Int, status: Status = .new) {
        id = UUID(); self.word = word; self.meaning = meaning; self.example = example
        self.source = source; self.week = week; self.day = day; self.status = status
    }
}
