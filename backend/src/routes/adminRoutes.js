const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  createExam, getMyExams, getExamById, updateExam, deleteExam, finalizeExam,
  addQuestion, updateQuestion, deleteQuestion,
  getResults, overrideScore, exportResults
} = require('../controllers/adminController');

// Make sure to import upload and extractQuestion at the top of your router file!
const { upload, extractQuestion } = require('../controllers/adminController');

// Add the new route!
router.post('/questions/extract', upload.single('document'), extractQuestion);

router.post('/exams', protect, createExam);
router.get('/exams', protect, getMyExams);
router.get('/exams/:id', protect, getExamById);
router.put('/exams/:id', protect, updateExam);
router.delete('/exams/:id', protect, deleteExam);
router.post('/exams/:id/finalize', protect, finalizeExam);

router.post('/exams/:examId/questions', protect, addQuestion);
router.put('/questions/:id', protect, updateQuestion);
router.delete('/questions/:id', protect, deleteQuestion);

router.get('/exams/:id/results', protect, getResults);
router.put('/answers/:id/override', protect, overrideScore);
router.get('/exams/:id/export', protect, exportResults);

module.exports = router;