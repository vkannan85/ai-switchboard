import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));

const modeInstructions = {
  handwritten:
    "Create concise handwritten-style study notes with headings, short bullet points, arrows, keywords, and simple explanations.",

  visualise:
    "Help a secondary-school student visualise the topic with a clear labelled educational diagram description and explanation.",

  teachme:
    "Teach the topic step by step for a secondary-school student. Start simple, give an example, and finish with a recap.",

  quiz:
    "Create a secondary-school quiz with a mixture of questions and a separate answer section at the end.",

  flashcard:
    "Create useful revision flashcards in Question / Answer format. Keep answers concise and accurate.",

  notes:
    "Create well-organised revision notes with headings, key facts, definitions, examples, and a short summary."
};

app.post("/api/generate", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured."
      });
    }

    const { mode, topic } = req.body || {};

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({
        error: "Please enter a topic."
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are AI Learning Hub, a safe, accurate and engaging educational assistant for secondary-school students."
        },
        {
          role: "user",
          content:
            `${modeInstructions[mode] || modeInstructions.teachme}

Topic or request:
${String(topic).trim()}`
        }
      ]
    });

    res.json({
      text:
        completion.choices?.[0]?.message?.content ||
        "No response was generated."
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        error?.message ||
        "Something went wrong while generating the response."
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use(express.static(__dirname));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Learning Switchboard running on port ${PORT}`);
});
