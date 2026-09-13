# AI Learning Switchboard

## Setup

1. Install Node.js (version 18 or newer).
2. Open a terminal in this project folder.
3. Run:

   npm install

4. Copy `.env.example` to a new file called `.env`.
5. Put your OpenAI API key in `.env`:

   OPENAI_API_KEY=your_key_here

6. Start the website:

   npm start

7. Open:

   http://localhost:3000

## Important security note

Never put your API key inside `public/index.html`. The server keeps the key private.

## Switches

- /handwritten
- /visualise
- /teachme
- /quiz
- /flashcard
- /notes
