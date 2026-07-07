const prisma = require('../utils/prismaClient');

const validateCode = async (req, res) => {
  try {
    const { code } = req.params;
    const examCode = await prisma.examCode.findUnique({
      where: { code },
      include: {
        exam: {
          include: { questions: { orderBy: { orderIndex: 'asc' } } }
        }
      }
    });

    if (!examCode) return res.status(404).json({ message: 'Invalid exam code' });
    if (!examCode.isActive) return res.status(400).json({ message: 'This exam code has been deactivated' });
    if (new Date() > examCode.expiresAt) return res.status(400).json({ message: 'Exam code has expired' });

    res.json({ exam: examCode.exam, expiresAt: examCode.expiresAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const startExamSession = async (req, res) => {
  try {
    const { code } = req.body;
    
    // 1. Find the exam
    const examCode = await prisma.examCode.findUnique({ 
      where: { code }, 
      include: { exam: { include: { questions: true } } } 
    });
    
    if (!examCode) return res.status(404).json({ message: 'Invalid code' });

    // 2. Check if the student already started this exam (Page Refresh Scenario)
    let submission = await prisma.submission.findFirst({
      where: { 
        studentId: req.user.userId, 
        examId: examCode.examId 
      }
    });

    // 3. If no submission exists, they just started! (First Attempt Scenario)
    if (!submission) {
      submission = await prisma.submission.create({
        data: {
          studentId: req.user.userId,
          examId: examCode.examId,
          status: 'in_progress',
          // Prisma automatically sets startedAt to the exact current server time!
        }
      });
    }

    // 4. Send back both the exam details AND their personal session data
    res.json({ exam: examCode.exam, submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { validateCode,startExamSession };