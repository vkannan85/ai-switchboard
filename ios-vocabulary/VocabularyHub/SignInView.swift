import SwiftUI

struct SignInView:View {
    @EnvironmentObject var sync:VocabularySync
    @State private var email=""
    @State private var password=""
    var body:some View {
        NavigationStack {
            VStack(spacing:18) {
                Image(systemName:"text.book.closed.fill").font(.system(size:64)).foregroundStyle(.indigo)
                Text("Vocabulary Hub").font(.largeTitle.bold())
                Text("Your personal Daily 5").foregroundStyle(.secondary)
                TextField("Email",text:$email).textContentType(.emailAddress).textInputAutocapitalization(.never).textFieldStyle(.roundedBorder)
                SecureField("Password",text:$password).textContentType(.password).textFieldStyle(.roundedBorder)
                Button("Sign in"){Task{await sync.signIn(email:email,password:password)}}.buttonStyle(.borderedProminent).controlSize(.large)
                if let m=sync.message { Text(m).font(.footnote).foregroundStyle(.red) }
                Text("Uses the same Supabase account as your Learning Hub.").font(.footnote).foregroundStyle(.secondary)
            }.padding(28)
        }
    }
}
