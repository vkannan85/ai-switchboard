# Vocabulary Hub for iOS

Private SwiftUI vocabulary app based on the AI Learning Hub vocabulary workflow.

## Features
- Daily 5: exactly 2 school words + 3 Year 7 words
- 10-week school vocabulary
- Flashcards and British-English text-to-speech
- Known / Need Practice tracking
- Fill-the-gap quiz
- Weekly recap and history
- Local offline persistence
- Optional Supabase sign-in/sync with existing `english_vocabulary_progress` and `english_vocabulary_mastery`

## Xcode setup
1. Open `VocabularyHub.xcodeproj` in Xcode 16+.
2. Add Swift Package Dependency: `https://github.com/supabase/supabase-swift` and add the `Supabase` product to the VocabularyHub target.
3. Copy `Config.example.xcconfig` to `Config.xcconfig` and put the existing Supabase project URL and **publishable** key there. Never use a secret/service-role key in the iOS app.
4. Set your personal Development Team under Signing & Capabilities.
5. Choose your iPhone or simulator and press Run.

The existing Supabase vocabulary tables already use per-user RLS. The app also works locally if Supabase is not configured.

Supabase's current SwiftUI quickstart recommends Swift Package Manager and a publishable key for mobile clients; RLS remains the security boundary.
