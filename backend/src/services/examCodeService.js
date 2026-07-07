const prisma = require('../utils/prismaClient');
const { scoreAnswer } = require('../services/evaluationService');

const evaluateSubmission = async (submissionId) => {
  try {
    // Get submission with answers and questions
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: {
          include: {
            question: {
              select: { modelAnswer: true, marks: true }
            }
          }
        }
      }
    });

    if (!submission) return;

    console.log(`Evaluating submission ${submissionId} with ${submission.answers.length} answers...`);

    // Score each answer sequentially
    for (const answer of submission.answers) {
      const aiScore = await scoreAnswer(
        answer.studentAnswer,
        answer.question.modelAnswer,
        answer.question.marks
      );

      await prisma.answer.update({
        where: { id: answer.id },
        data: { aiScore }
      });

      console.log(`Answer ${answer.id} scored: ${aiScore}`);
    }

    console.log(`Evaluation complete for submission ${submissionId}`);
  } catch (err) {
    console.error(`Evaluation failed for submission ${submissionId}:`, err.message);
  }
};

module.exports = { evaluateSubmission };