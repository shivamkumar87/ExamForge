const prisma = require("../utils/prismaClient");
const { generateExamCode } = require("../utils/codeGen");
const multer = require("multer");
const Groq = require("groq-sdk");

const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_EXTRACTION_KEY });

// Helper to extract text from PDF buffer
const extractPdfText = (buffer) => {
  return new Promise((resolve, reject) => {
    const parser = new pdf2json();

    parser.on("pdfParser_dataReady", (data) => {
      const text = data.Pages.map((page) =>
        page.Texts.map((t) => decodeURIComponent(t.R[0].T)).join(" "),
      ).join("\n");
      resolve(text.trim());
    });

    parser.on("pdfParser_dataError", (err) => {
      reject(new Error(err.parserError));
    });

    parser.parseBuffer(buffer);
  });
};
// ── EXAM CRUD ──────────────────────────────────────────────────────

const createExam = async (req, res) => {
  try {
    const { title, subject, durationMinutes, totalMarks } = req.body;
    const exam = await prisma.exam.create({
      data: {
        adminId: req.user.userId,
        title,
        subject,
        durationMinutes: parseInt(durationMinutes),
        totalMarks: parseInt(totalMarks),
        status: "draft",
      },
    });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyExams = async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      where: { adminId: req.user.userId },
      include: { questions: true, examCodes: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getExamById = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
        examCodes: true,
      },
    });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (exam.adminId !== req.user.userId)
      return res.status(403).json({ message: "Forbidden" });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateExam = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (exam.adminId !== req.user.userId)
      return res.status(403).json({ message: "Forbidden" });
    if (exam.status !== "draft")
      return res.status(400).json({ message: "Cannot edit a finalized exam" });
    const updated = await prisma.exam.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const finalizeExam = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      include: { questions: true },
    });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (exam.adminId !== req.user.userId)
      return res.status(403).json({ message: "Forbidden" });
    if (exam.status !== "draft")
      return res.status(400).json({ message: "Exam already finalized" });
    if (exam.questions.length === 0)
      return res
        .status(400)
        .json({ message: "Add at least one question before finalizing" });

    const code = generateExamCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.exam.update({
      where: { id: req.params.id },
      data: { status: "active" },
    });

    const examCode = await prisma.examCode.create({
      data: { examId: exam.id, code, expiresAt, isActive: true },
    });

    const shareableLink = `${process.env.FRONTEND_URL}/join?code=${code}`;
    res.json({ code, expiresAt, shareableLink, examCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const extractQuestion = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "No image uploaded." });

    const base64Image = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a strict data extractor. Read the attached image and extract EVERY question and its corresponding answer.
       
       CRITICAL RULES FOR LISTS AND MCQs:
       1. For MCQs: If the QUESTION itself has multiple choice options (e.g., A, B, C, D), include those options inside the "question" string, separated by newlines. 
          Example: "What is the capital?\\nA) London\\nB) Paris"
       2. For Multi-part Answers: If the ANSWER contains a list or sub-points (e.g., i., ii., iii.), do NOT treat them as MCQ options. They belong strictly in the "modelAnswer" string. Keep their original formatting and newlines.
          Example modelAnswer: "The changes that will occur:\\ni. We can move our head.\\nii. Our neck can be turned."
       
       If a question does not have an answer provided, leave the modelAnswer field as an empty string.
       Do not include any conversational text.
       
       Respond ONLY with a single, valid JSON object containing an array called "extractedQuestions" in this exact format:
       {
         "extractedQuestions": [
           {
             "question": "The full text of the question (plus MCQ options if applicable).",
             "modelAnswer": "Text of the answer (including any i, ii, iii lists if they are part of the answer)."
           }
         ]
       }`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    // 1. Get the raw text from Groq
    let rawResponse = completion.choices[0].message.content;

    // 2. SPY ON GROQ: Print exactly what it said to your terminal
    console.log("Raw AI Response:", rawResponse);

    // 3. CLEAN THE DATA: Strip out any markdown formatting Groq might have added
    rawResponse = rawResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // 4. Send it safely to React
    const extractedData = JSON.parse(rawResponse);
    res.status(200).json(extractedData);
  } catch (error) {
    console.error("Groq Extraction Error:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to extract text from image." });
  }
};

// ── QUESTION CRUD ──────────────────────────────────────────────────

const addQuestion = async (req, res) => {
  try {
    const { questionText, modelAnswer, marks } = req.body;
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.examId },
    });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (exam.adminId !== req.user.userId)
      return res.status(403).json({ message: "Forbidden" });
    if (exam.status !== "draft")
      return res.status(400).json({ message: "Cannot edit a finalized exam" });

    const count = await prisma.question.count({
      where: { examId: req.params.examId },
    });
    const question = await prisma.question.create({
      data: {
        examId: req.params.examId,
        questionText,
        modelAnswer,
        marks: parseInt(marks),
        orderIndex: count + 1,
      },
    });
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
    });
    if (!question)
      return res.status(404).json({ message: "Question not found" });
    const exam = await prisma.exam.findUnique({
      where: { id: question.examId },
    });
    if (exam.adminId !== req.user.userId)
      return res.status(403).json({ message: "Forbidden" });
    if (exam.status !== "draft")
      return res.status(400).json({ message: "Cannot edit a finalized exam" });
    const updated = await prisma.question.update({
      where: { id: req.params.id },
      data: {
        questionText: req.body.questionText,
        modelAnswer: req.body.modelAnswer,
        marks: parseInt(req.body.marks), // ← parse to integer
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
    });
    if (!question)
      return res.status(404).json({ message: "Question not found" });
    const exam = await prisma.exam.findUnique({
      where: { id: question.examId },
    });
    if (exam.adminId !== req.user.userId)
      return res.status(403).json({ message: "Forbidden" });
    if (exam.status !== "draft")
      return res.status(400).json({ message: "Cannot edit a finalized exam" });
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ message: "Question deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getResults = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.id },
      select: { title: true, subject: true },
    });
    const submissions = await prisma.submission.findMany({
      where: { examId: req.params.id },
      include: {
        student: { select: { name: true, email: true } },
        answers: {
          include: {
            question: {
              select: { questionText: true, marks: true, modelAnswer: true },
            },
          },
        },
        violations: true,
      },
      orderBy: { submittedAt: "desc" },
    });
    res.json({ exam, submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const overrideScore = async (req, res) => {
  try {
    const { score } = req.body;
    const answer = await prisma.answer.update({
      where: { id: req.params.id },
      data: { adminOverrideScore: parseFloat(score) },
    });
    res.json(answer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const exportResults = async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { examId: req.params.id },
      include: {
        student: { select: { name: true, email: true } },
        answers: { include: { question: true } },
      },
    });
    let csv = "Student Name,Email,Submitted At,Total Score,Violations\n";
    submissions.forEach((sub) => {
      const total = sub.answers.reduce(
        (sum, a) => sum + (a.adminOverrideScore ?? a.aiScore ?? 0),
        0,
      );
      csv += `"${sub.student.name}","${sub.student.email}","${sub.submittedAt}",${total},${sub.violationCount}\n`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=results.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const deleteExam = async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (exam.adminId !== req.user.userId)
      return res.status(403).json({ message: "Forbidden" });

    // Delete in correct order to avoid FK constraint errors
    const submissions = await prisma.submission.findMany({
      where: { examId: exam.id },
    });
    for (const sub of submissions) {
      await prisma.violation.deleteMany({ where: { submissionId: sub.id } });
      await prisma.answer.deleteMany({ where: { submissionId: sub.id } });
    }
    await prisma.submission.deleteMany({ where: { examId: exam.id } });
    await prisma.examCode.deleteMany({ where: { examId: exam.id } });
    await prisma.question.deleteMany({ where: { examId: exam.id } });
    await prisma.exam.delete({ where: { id: exam.id } });

    res.json({ message: "Exam deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createExam,
  getMyExams,
  getExamById,
  updateExam,
  deleteExam,
  finalizeExam,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getResults,
  overrideScore,
  exportResults,
  upload,
  extractQuestion, // ← Export the new AI function
};
