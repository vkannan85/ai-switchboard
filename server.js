import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

if (!process.env.OPENAI_API_KEY) {
  console.warn("WARNING: OPENAI_API_KEY is missing. Create a .env file.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const modeInstructions = {
  handwritten: "Create clear handwritten-notebook-style study notes using headings, short bullet points, simple language, memory tips and a brief summary.",
  visualise: "Teach through vivid visual imagination. Describe the topic as a step-by-step visual journey. Use simple scenes, comparisons and mental pictures.",
  teachme: "Act as an excellent friendly secondary-school teacher. Explain from basics to deeper understanding using age-appropriate language and examples.",
  quiz: "Create a varied secondary-school quiz with 10 questions. Mix multiple choice, short answer and application questions. Put answers in a clearly labelled section at the end.",
  flashcard: "Create 10 concise revision flashcards. Format each as 'Question:' followed by 'Answer:'. Focus on key facts and exam recall.",
  notes: "Create excellent revision notes for a secondary-school student with a definition, key ideas, important vocabulary, examples, common mistakes and a quick summary."
};

app.post("/api/generate", async (req, res) => {
  try {
    const { topic, mode } = req.body;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Please enter a topic." });
    }
    if (!modeInstructions[mode]) {
      return res.status(400).json({ error: "Invalid learning mode." });
    }

    const prompt = `Topic: ${topic}

${modeInstructions[mode]}

Rules:
- Aim at secondary-school students.
- Be accurate, engaging and encouraging.
- Use Markdown formatting.
- Do not claim knowledge that is uncertain.
- Keep the response focused on the requested topic.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are AI Learning Hub, a safe and engaging educational assistant for secondary-school students." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const text = completion.choices?.[0]?.message?.content || "No response generated.";
    res.json({ text });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to generate the learning content. Check your API key and server connection."
    });
  }
});

app.listen(port, () => {
  console.log(`AI Learning Switchboard running at http://localhost:${port}`);
});
