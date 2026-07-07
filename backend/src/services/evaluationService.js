const natural = require('natural');
const OpenAI = require('openai');

// Initialize Groq client using the OpenAI SDK template
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// ── Primary: Groq Smart Evaluation ───────────────────────────── 
const groqScore = async (studentAnswer, modelAnswer, marks) => {
  const prompt = `You are an expert academic evaluator grading exam question. Your goal is to evaluate the student's answer based PURELY on its core meaning and conceptual understanding compared to the model answer. 

Model Answer: "${modelAnswer}"
Student's Answer: "${studentAnswer}"
Maximum Marks Allowed: ${marks}

CRITICAL GRADING RULES:
- Award 100% FULL MARKS (${marks}) if the student's answer clearly conveys the same fundamental meaning, concepts, or facts as the model answer. 
- DO NOT deduct marks for casual phrasing, minor grammatical mistakes, spacing, missing punctuation, or lack of formal vocabulary. If the understanding is there, give full marks.
- Award partial marks only if the student's answer is genuinely missing core elements of the model answer or is incomplete.
- Award 0 marks only if the answer is completely wrong, irrelevant, blank, or nonsensical.

Respond with ONLY a single number (integer or decimal) representing the awarded marks. Do not include explanations, units, characters, or markdown formatting. Just output the raw number.`;


  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.1, // Keep evaluations deterministic and strict
    max_tokens: 10,
  });

  const raw = response.choices[0]?.message?.content || '0';

  // Extract the first numeric value from the response safely
  const match = raw.trim().match(/[\d.]+/);
  const awarded = match ? parseFloat(match[0]) : 0;

  // Clamp the score securely between 0 and max marks
  const final = parseFloat(Math.min(marks, Math.max(0, awarded)).toFixed(2));
  console.log(`Groq LLM scored: ${final}/${marks} | Student: "${studentAnswer}"`);
  return final;
};

// ── Fallback: TF-IDF Cosine Similarity ──────────────────────────
const tfidfScore = (studentAnswer, modelAnswer, marks) => {
  try {
    if (!studentAnswer || !modelAnswer) return 0;

    const tokenizer = new natural.WordTokenizer();
    const stemmer = natural.PorterStemmer;

    const tokenize = (text) =>
      tokenizer.tokenize(text.toLowerCase())
        .map(word => stemmer.stem(word))
        .join(' ');

    const docA = tokenize(modelAnswer);
    const docB = tokenize(studentAnswer);

    const tfidf = new natural.TfIdf();
    tfidf.addDocument(docA);
    tfidf.addDocument(docB);

    const terms = new Set([
      ...tokenizer.tokenize(docA),
      ...tokenizer.tokenize(docB)
    ]);

    const vecA = [];
    const vecB = [];

    terms.forEach(term => {
      let scoreA = 0;
      let scoreB = 0;
      tfidf.tfidfs(term, (i, measure) => {
        if (i === 0) scoreA = measure;
        if (i === 1) scoreB = measure;
      });
      vecA.push(scoreA);
      vecB.push(scoreB);
    });

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magA === 0 || magB === 0) return 0;

    const similarity = Math.min(1, Math.max(0, dotProduct / (magA * magB)));

    let awarded;
    if (similarity > 0.75) awarded = marks;
    else if (similarity >= 0.5) awarded = similarity * marks;
    else awarded = similarity * marks * 0.5;

    const final = parseFloat(awarded.toFixed(2));
    console.log(`TF-IDF fallback scored: ${final}/${marks}`);
    return final;
  } catch (err) {
    console.error('TF-IDF fallback error:', err.message);
    return 0;
  }
};

// ── Main scorer — tries Groq first, falls back to TF-IDF ──────
const scoreAnswer = async (studentAnswer, modelAnswer, marks) => {
  if (!studentAnswer || studentAnswer.trim().length === 0) return 0;

  try {
    return await groqScore(studentAnswer, modelAnswer, marks);
  } catch (err) {
    console.warn(`Groq evaluation failed (${err.message}), triggering TF-IDF fallback...`);
    return tfidfScore(studentAnswer, modelAnswer, marks);
  }
};

module.exports = { scoreAnswer };