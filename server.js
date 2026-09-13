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

app.use(express.json({ limit: "2mb" }));

const textModeInstructions = {
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
    const cleanTopic = String(topic || "").trim();

    if (!cleanTopic) {
      return res.status(400).json({
        error: "Please enter a topic."
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // ---------------------------------
    // HANDWRITTEN MODE = IMAGE
    // ---------------------------------

    if (mode === "handwritten") {
      const imagePrompt = `
Create a beautiful educational handwritten notebook page about:

"${cleanTopic}"

STYLE:
- Genuine handwritten student revision notes
- Portrait notebook page
- White or warm off-white ruled paper
- Neat blue and black handwritten ink
- Colourful highlighter accents
- Hand-drawn arrows, circles, boxes and underlines
- Small hand-drawn educational illustrations where useful
- Visually attractive and organised
- Similar to excellent secondary-school revision notes
- NOT a typed document
- NOT a PowerPoint slide
- NOT a digital infographic
- The writing must look handwritten
- Show the notebook page only
- Do not show hands, desks, pens or people

CONTENT:
- Clear handwritten title
- Simple definition
- Important keywords
- Key facts
- Short explanations
- Helpful labelled sketch or diagram when relevant
- One memorable summary or exam tip

Keep the amount of text moderate so that it stays readable.
Make the educational content accurate and suitable for a secondary-school student.
`;

      const imageResult = await client.images.generate({
        model: "gpt-image-2",
        prompt: imagePrompt,
        size: "1024x1536"
      });

      const generatedImage = imageResult.data?.[0];

      if (!generatedImage) {
        return res.status(500).json({
          error: "No image was generated."
        });
      }

      // Some image API responses return base64.
      if (generatedImage.b64_json) {
        return res.json({
          type: "image",
          image: `data:image/png;base64,${generatedImage.b64_json}`
        });
      }

      // Fallback if API returns a URL.
      if (generatedImage.url) {
        return res.json({
          type: "image",
          image: generatedImage.url
        });
      }

      return res.status(500).json({
        error: "Image generation returned no usable image."
      });
    }

    // ---------------------------------
    // OTHER MODES = TEXT
    // ---------------------------------

    const instruction =
      textModeInstructions[mode] ||
      textModeInstructions.teachme;

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
            `${instruction}

Topic or request:

${cleanTopic}`
        }
      ]
    });

    res.json({
      type: "text",

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

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});

app.use(
  express.static(__dirname)
);

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `AI Learning Switchboard running on port ${PORT}`
    );

  }
);