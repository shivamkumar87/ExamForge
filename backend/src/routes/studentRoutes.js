const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const prisma = require("../utils/prismaClient");

router.post("/validate-code", protect, async (req, res) => {
  try {
    const { code } = req.body;
    const examCode = await prisma.examCode.findUnique({
      where: { code },
      include: { exam: { include: { questions: true } } },
    });
    if (!examCode)
      return res.status(404).json({ message: "Invalid exam code" });
    if (!examCode.isActive)
      return res.status(400).json({ message: "Exam code is inactive" });
    if (new Date() > examCode.expiresAt)
      return res.status(400).json({ message: "Exam code has expired" });

    // ← Check if already submitted
    // ← Check if already submitted
    const existing = await prisma.submission.findFirst({
      where: {
        examId: examCode.exam.id,
        studentId: req.user.userId,
      },
    });
    // ONLY block them if they actually finished it!
    if (
      existing &&
      (existing.status === "complete" || existing.status === "flagged")
    ) {
      return res
        .status(400)
        .json({ message: "You have already submitted this exam" });
    }

    res.json({
      examId: examCode.exam.id,
      title: examCode.exam.title,
      subject: examCode.exam.subject,
      durationMinutes: examCode.exam.durationMinutes,
      totalMarks: examCode.exam.totalMarks,
      questionCount: examCode.exam.questions.length,
      code,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/start", protect, async (req, res) => {
  try {
    const { code } = req.body;

    // 1. Find the exam
    const examCode = await prisma.examCode.findUnique({
      where: { code },
      include: { exam: { include: { questions: true } } },
    });
    if (!examCode)
      return res.status(404).json({ message: "Invalid exam code" });

    // 2. Check if a submission already exists (for page refreshes)
    let submission = await prisma.submission.findFirst({
      where: {
        examId: examCode.exam.id,
        studentId: req.user.userId,
      },
    });

    // 3. If no submission exists, they just started! Create it to start the timer.
    if (!submission) {
      submission = await prisma.submission.create({
        data: {
          examId: examCode.exam.id,
          studentId: req.user.userId,
          status: "in_progress", // Starts the session
          violationCount: 0,
        },
      });
    } else if (
      submission.status === "complete" ||
      submission.status === "flagged"
    ) {
      return res.status(400).json({ message: "Exam already completed" });
    }

    res.json({ exam: examCode.exam, submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/exam/:code", protect, async (req, res) => {
  try {
    const examCode = await prisma.examCode.findUnique({
      where: { code: req.params.code },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
              select: {
                id: true,
                questionText: true,
                marks: true,
                orderIndex: true,
              },
            },
          },
        },
      },
    });
    if (!examCode)
      return res.status(404).json({ message: "Invalid exam code" });
    res.json({
      questions: examCode.exam.questions,
      title: examCode.exam.title,
      durationMinutes: examCode.exam.durationMinutes,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/submit", protect, async (req, res) => {
  try {
    const { examCode, answers, violationCount, submitReason } = req.body;

    const code = await prisma.examCode.findUnique({
      where: { code: examCode },
      include: { exam: { include: { questions: true } } },
    });
    if (!code) return res.status(404).json({ message: "Invalid exam code" });

    const existing = await prisma.submission.findFirst({
      where: {
        examId: code.exam.id,
        studentId: req.user.userId,
      },
    });

    if (!existing)
      return res.status(400).json({ message: "No active exam session found" });
    if (existing.status === "complete" || existing.status === "flagged") {
      return res.status(400).json({ message: "You have already submitted this exam" });
    }

    const submission = await prisma.submission.update({
      where: { id: existing.id },
      data: {
        status: violationCount >= 3 ? "flagged" : "complete",
        violationCount: violationCount || 0,
      },
    });

    for (const question of code.exam.questions) {
      const existingAnswer = await prisma.answer.findFirst({
        where: { submissionId: submission.id, questionId: question.id },
      });

      const finalAnswerText = answers[question.id] || "";

      if (existingAnswer) {
        await prisma.answer.update({
          where: { id: existingAnswer.id },
          data: { studentAnswer: finalAnswerText },
        });
      } else {
        await prisma.answer.create({
          data: {
            submissionId: submission.id,
            questionId: question.id,
            studentAnswer: finalAnswerText,
            aiScore: null,
          },
        });
      }
    }


    // ✅ Send response FIRST
    res.json({
      message: "Exam submitted successfully",
      submissionId: submission.id,
    });

    // ✅ Run evaluation AFTER — wrapped in setImmediate so it never affects the response
    setImmediate(async () => {
      try {
        console.log('🔄 Starting evaluation for submission:', submission.id);
        const { evaluateSubmission } = require('../services/examCodeService');
        await evaluateSubmission(submission.id);
        console.log('✅ Evaluation complete for submission:', submission.id);
      } catch (err) {
        console.error('Background evaluation error:', err.message);
      }
    });

  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: err.message });
    }
  }
});


router.post('/autosave', protect, async (req, res) => {
  try {
    const { submissionId, answers } = req.body;
    
    // If there is no data to save yet, just skip it
    if (!submissionId || !answers) return res.json({ message: 'Skipped empty autosave' });

    for (const [questionId, answerText] of Object.entries(answers)) {
      const existingAnswer = await prisma.answer.findFirst({
        where: { submissionId: submissionId, questionId: questionId }
      });

      if (existingAnswer) {
        await prisma.answer.update({
          where: { id: existingAnswer.id },
          data: { studentAnswer: answerText }
        });
      } else {
        await prisma.answer.create({
          data: {
            submissionId: submissionId,
            questionId: questionId,
            studentAnswer: answerText,
            aiScore: null
          }
        });
      }
    }
    res.json({ message: 'Saved successfully' });
  } catch (err) {
    console.error("Autosave Error:", err); 
    res.status(500).json({ message: err.message });
  }
});

router.post("/violation", protect, async (req, res) => {
  try {
    const { submissionId, type, timestamp } = req.body;
    if (submissionId) {
      await prisma.violation.create({
        data: { submissionId, type, timestamp: new Date(timestamp) },
      });
      await prisma.submission.update({
        where: { id: submissionId },
        data: { violationCount: { increment: 1 } },
      });
    }
    res.json({ message: "Violation logged" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Add this route for past exams
router.get("/my-submissions", protect, async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { studentId: req.user.userId },
      include: {
        exam: { select: { title: true, subject: true, totalMarks: true } },
        answers: true,
      },
      orderBy: { submittedAt: "desc" },
    });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
