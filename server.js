require("dotenv").config();
const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = "https://rikeknoqjmnxkgfutmpy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NfbRUCQo1cb0rMmJ1pHcaA_AsuubptW";

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
    if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1));
    throw new Error("Model returned invalid JSON");
  }
}

async function requireUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ error: "Please sign in first." });
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY
      }
    });

    if (!response.ok) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }

    req.user = await response.json();
    next();
  } catch (error) {
    console.error("Auth validation error:", error);
    res.status(401).json({ error: "Unable to verify your sign-in." });
  }
}

function getUserOpenAIClient(req) {
  const apiKey = String(req.headers["x-openai-key"] || "").trim();
  if (!apiKey) {
    const error = new Error(
      "Add your own OpenAI API key before generating. The key is used only for your request and is not stored by this app."
    );
    error.statusCode = 400;
    throw error;
  }
  return new OpenAI({ apiKey });
}

async function generateJson(client, system, user) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.5,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  return safeJsonParse(response.choices?.[0]?.message?.content || "{}");
}

async function generateImage(client, prompt) {
  const response = await client.images.generate({
    model: "gpt-image-2",
    prompt,
    size: "1024x1536"
  });

  const item = response.data?.[0];
  if (!item) throw new Error("No image returned");
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item.url) return item.url;
  throw new Error("Image response did not include image data");
}

app.get("/api/config", (_req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabasePublishableKey: SUPABASE_PUBLISHABLE_KEY
  });
});

app.post("/api/generate", requireUser, async (req, res) => {
  try {
    const client = getUserOpenAIClient(req);
    const mode = String(req.body?.mode || "").toLowerCase();
    const topic = cleanTopic(req.body?.topic);

    if (!topic) return res.status(400).json({ error: "Please enter a topic." });

    if (mode === "handwritten") {
      const image = await generateImage(
        client,
        `Create a beautiful educational handwritten notebook page about "${topic}". Genuine handwritten student revision notes on portrait ruled paper, neat blue and black ink, tasteful highlighter accents, hand-drawn arrows, boxes and underlines, and a small labelled educational sketch where useful. Include a clear title, simple definition, important keywords, key facts, short explanations and one memorable exam tip. Keep text moderate and readable. Accurate for a secondary-school learner. Show the notebook page only. No hands, desk, pens, people, typed document, PowerPoint or digital infographic.`
      );
      return res.json({ type: "image", mode: "handwritten", image });
    }

    if (mode === "visualise" || mode === "visualize") {
      const image = await generateImage(
        client,
        `Create a clear educational visual explanation of "${topic}" for a secondary-school learner. Use a clean modern educational illustration with strong visual hierarchy, labelled diagrams, arrows showing relationships, simple icons and shapes, minimal useful text, portrait composition and one short takeaway. Prioritise accuracy and understanding. Not a notebook page and not a long text document.`
      );
      return res.json({ type: "image", mode: "visualise", image });
    }

    if (mode === "quiz") {
      const data = await generateJson(
        client,
        `You create accurate educational multiple-choice quizzes for secondary-school learners. Return ONLY valid JSON with this exact shape: {"title":"Quiz title","questions":[{"question":"Question text","options":["Option A","Option B","Option C","Option D"],"correctIndex":0,"explanation":"Short explanation"}]}. Exactly 5 questions. Exactly 4 options for every question. Exactly one correct answer. correctIndex must be 0,1,2 or 3. Wrong answers should be plausible. Explanations should teach. No markdown.`,
        `Create a five-question quiz about "${topic}".`
      );
      return res.json({ type: "quiz", mode: "quiz", ...data });
    }

    if (mode === "flashcard") {
      const data = await generateJson(
        client,
        `Create educational revision flashcards. Return ONLY valid JSON with this exact shape: {"title":"Flashcard title","cards":[{"front":"Question, term or prompt","back":"Answer or explanation"}]}. Exactly 8 flashcards. Cover different important aspects. Keep backs concise. Avoid duplicates. Suitable for secondary-school revision. No markdown.`,
        `Create eight useful flashcards about "${topic}".`
      );
      return res.json({ type: "flashcards", mode: "flashcard", ...data });
    }

    if (mode === "teachme") {
      const data = await generateJson(
        client,
        `You are a patient expert tutor for secondary-school learners. Return ONLY valid JSON with this exact shape: {"title":"Lesson title","overview":"Short simple introduction","sections":[{"heading":"Section heading","content":"Clear explanation"}],"example":{"heading":"Example","content":"Helpful example"},"checkQuestion":"Question to check understanding","answer":"Answer to the check question","recap":["Important point","Important point","Important point"]}. Use 3-5 teaching sections. Build understanding step by step, explain terminology, include an example and check question, and finish with recap. No markdown.`,
        `Teach me "${topic}" clearly and step by step.`
      );
      return res.json({ type: "lesson", mode: "teachme", ...data });
    }

    if (mode === "notes") {
      const data = await generateJson(
        client,
        `Create high-quality revision notes for secondary-school learners. Return ONLY valid JSON with this exact shape: {"title":"Revision notes title","summary":"Short summary","sections":[{"heading":"Heading","bullets":["Important point"]}],"keywords":[{"term":"Keyword","meaning":"Simple meaning"}],"examTips":["Exam tip"]}. Use 3-5 sections, 3-5 bullets per section, 4-8 keywords and 2-4 exam tips. Be clear, concise and accurate. No markdown.`,
        `Create high-quality revision notes about "${topic}".`
      );
      return res.json({ type: "notes", mode: "notes", ...data });
    }

    return res.status(400).json({ error: "Unknown learning mode." });
  } catch (error) {
    console.error("Generation error:", error);
    const message = error?.error?.message || error?.message || "Something went wrong while generating the result.";
    res.status(error?.statusCode || 500).json({ error: message });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Learning Switchboard v2 running on port ${PORT}`);
});