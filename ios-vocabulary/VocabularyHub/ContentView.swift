import SwiftUI

struct ContentView:View {
    @EnvironmentObject var sync:VocabularySync
    var body:some View {
        TabView {
            NavigationStack{TodayView()}.tabItem{Label("Today",systemImage:"sun.max.fill")}
            NavigationStack{FlashcardsView()}.tabItem{Label("Cards",systemImage:"rectangle.on.rectangle.angled")}
            NavigationStack{WeeklyView()}.tabItem{Label("Weekly",systemImage:"calendar")}
            NavigationStack{HistoryView()}.tabItem{Label("History",systemImage:"clock.arrow.circlepath")}
            NavigationStack{ProgressViewScreen()}.tabItem{Label("Progress",systemImage:"chart.bar.fill")}
        }.tint(.indigo)
    }
}
