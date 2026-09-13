require("dotenv").config();
const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

function cleanTopic(topic) {
  return String(topic || "").trim().slice(0, 500);
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");

    if (first >= 0 && last > first) {
      return JSON.parse(text.slice(first, last + 1));
    }

    throw new Error("Model returned invalid JSON");
  }
}

async function generateJson(system, user) {
  const result = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.5,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  return safeJsonParse(
    result.choices?.[0]?.message?.content || "{}"
  );
}

async function generateImage(prompt) {
  const imageResult = await client.images.generate({
    model: "gpt-image-2",
    prompt: prompt,
    size: "1024x1536"
  });

  const item = imageResult.data?.[0];

  if (!item) {
    throw new Error("No image returned");
  }

  if (item.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }

  if (item.url) {
    return item.url;
  }

  throw new Error("Image response did not include image data");
}

app.post("/api/generate", async (req, res) => {
  try {
    const mode = String(req.body?.mode || "").toLowerCase();
    const topic = cleanTopic(req.body?.topic);

    if (!topic) {
      return res.status(400).json({
        error: "Please enter a topic."
      });
    }

    // =====================================================
    // HANDWRITTEN
    // =====================================================

    if (mode === "handwritten") {
      const prompt = `
Create a beautiful educational handwritten notebook page about "${topic}".

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

Keep the amount of text moderate so it remains readable.

Make the educational content accurate and suitable for a secondary-school student.
`;

      const image = await generateImage(prompt);

      return res.json({
        type: "image",
        mode: "handwritten",
        image: image
      });
    }

    // =====================================================
    // VISUALISE
    // =====================================================

    if (mode === "visualise" || mode === "visualize") {
      const prompt = `
Create a clear educational visual explanation of "${topic}".

TARGET:
Secondary-school learner.

STYLE:
- Clean educational illustration
- Strong visual hierarchy
- Labelled diagrams
- Arrows showing relationships
- Simple educational icons and shapes
- Minimal but useful text
- Easy to understand at a glance
- Portrait composition
- Modern educational graphic
- Visually engaging
- NOT a notebook page
- NOT a long text document
- Avoid decorative clutter

CONTENT:
- Clear title
- Main concept represented visually
- Important parts labelled
- Relationships or processes shown using arrows
- Small supporting explanations
- One short takeaway at the bottom

Prioritise educational accuracy and visual understanding.
`;

      const image = await generateImage(prompt);

      return res.json({
        type: "image",
        mode: "visualise",
        image: image
      });
    }

    // =====================================================
    // QUIZ
    // =====================================================

    if (mode === "quiz") {
      const data = await generateJson(
        `
You create accurate educational multiple-choice quizzes
for secondary-school learners.

Return ONLY valid JSON.

Use this exact structure:

{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctIndex": 0,
      "explanation": "Short explanation"
    }
  ]
}

RULES:

- Exactly 5 questions.
- Exactly 4 options for every question.
- Exactly ONE correct answer.
- correctIndex must be 0, 1, 2 or 3.
- Questions must be factually accurate.
- Wrong answers should be plausible.
- Explanation should help the learner understand.
- Do not use markdown.
`,
        `Create a five-question quiz about "${topic}".`
      );

      return res.json({
        type: "quiz",
        mode: "quiz",
        ...data
      });
    }

    // =====================================================
    // FLASHCARDS
    // =====================================================

    if (mode === "flashcard") {
      const data = await generateJson(
        `
You create educational revision flashcards.

Return ONLY valid JSON.

Use this exact structure:

{
  "title": "Flashcard title",
  "cards": [
    {
      "front": "Question, term or prompt",
      "back": "Answer or explanation"
    }
  ]
}

RULES:

- Exactly 8 flashcards.
- Front should contain a useful question, term or prompt.
- Back should contain a concise answer.
- Cards should cover different important aspects of the topic.
- Avoid duplicate cards.
- Suitable for secondary-school revision.
- Do not use markdown.
`,
        `Create eight useful flashcards about "${topic}".`
      );

      return res.json({
        type: "flashcards",
        mode: "flashcard",
        ...data
      });
    }

    // =====================================================
    // TEACH ME
    // =====================================================

    if (mode === "teachme") {
      const data = await generateJson(
        `
You are a patient expert tutor for secondary-school learners.

Return ONLY valid JSON.

Use this exact structure:

{
  "title": "Lesson title",

  "overview":
    "Short simple introduction",

  "sections": [
    {
      "heading": "Section heading",
      "content": "Clear explanation"
    }
  ],

  "example": {
    "heading": "Example",
    "content": "Helpful example"
  },

  "checkQuestion":
    "Question to check understanding",

  "answer":
    "Answer to the check question",

  "recap": [
    "Important point",
    "Important point",
    "Important point"
  ]
}

RULES:

- Use 3 to 5 teaching sections.
- Start simple.
- Build understanding step by step.
- Explain unfamiliar terminology.
- Include an example.
- Include a check-your-understanding question.
- Finish with a short recap.
- Keep language clear.
- Do not use markdown.
`,
        `Teach me "${topic}" clearly and step by step.`
      );

      return res.json({
        type: "lesson",
        mode: "teachme",
        ...data
      });
    }

    // =====================================================
    // NOTES
    // =====================================================

    if (mode === "notes") {
      const data = await generateJson(
        `
You create high-quality revision notes
for secondary-school learners.

Return ONLY valid JSON.

Use this exact structure:

{
  "title": "Revision notes title",

  "summary":
    "Short summary",

  "sections": [
    {
      "heading": "Heading",
      "bullets": [
        "Important point",
        "Important point"
      ]
    }
  ],

  "keywords": [
    {
      "term": "Keyword",
      "meaning": "Simple meaning"
    }
  ],

  "examTips": [
    "Exam tip"
  ]
}

RULES:

- 3 to 5 sections.
- 3 to 5 bullet points per section.
- 4 to 8 important keywords.
- 2 to 4 exam tips.
- Clear and concise.
- Accurate educational information.
- Do not use markdown.
`,
        `Create high-quality revision notes about "${topic}".`
      );

      return res.json({
        type: "notes",
        mode: "notes",
        ...data
      });
    }

    return res.status(400).json({
      error: "Unknown learning mode."
    });

  } catch (error) {
    console.error("Generation error:", error);

    const message =
      error?.error?.message ||
      error?.message ||
      "Something went wrong while generating the result.";

    res.status(500).json({
      error: message
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `AI Learning Switchboard running on port ${PORT}`
  );
});