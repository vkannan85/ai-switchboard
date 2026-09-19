import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            NavigationStack { TodayView() }.tabItem { Label("Today", systemImage:"sun.max.fill") }
            NavigationStack { FlashcardsView() }.tabItem { Label("Cards", systemImage:"rectangle.on.rectangle.angled") }
            NavigationStack { WeeklyView() }.tabItem { Label("Weekly", systemImage:"calendar") }
            NavigationStack { ProgressViewScreen() }.tabItem { Label("Progress", systemImage:"chart.bar.fill") }
        }.tint(.indigo)
    }
}
