import express from "express";
import {
  getQuizzesByExam,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  toggleQuizActive,
  startQuizAttempt,
  submitAnswer,
  completeQuizAttempt,
  getQuizAttempt,
  getStudentQuizAttempts,
  getQuizResults,
} from "../controllers/quizController.js";
import { verifyToken, checkRole } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Routes accessible by all authenticated users, but content filtered by role in controller
router.get("/exam/:examId", getQuizzesByExam);
router.get("/:id", getQuizById);

// Protected routes - only for Exam Coordinator, Exam Manager, and Admin
router.post(
  "/",
  checkRole(["Admin", "Exam Manager", "Exam Coordinator"]),
  createQuiz
);
router.put(
  "/:id",
  checkRole(["Admin", "Exam Manager", "Exam Coordinator"]),
  updateQuiz
);
router.delete(
  "/:id",
  checkRole(["Admin", "Exam Manager", "Exam Coordinator"]),
  deleteQuiz
);
router.patch(
  "/:id/toggle-active",
  checkRole(["Admin", "Exam Manager", "Exam Coordinator"]),
  toggleQuizActive
);
router.get(
  "/:id/results",
  checkRole(["Admin", "Exam Manager", "Exam Coordinator"]),
  getQuizResults
);

// Student routes for taking quizzes
router.post("/:quizId/attempt", checkRole(["Student"]), startQuizAttempt);
router.post("/attempt/:attemptId/submit", checkRole(["Student"]), submitAnswer);
router.post(
  "/attempt/:attemptId/complete",
  checkRole(["Student"]),
  completeQuizAttempt
);
router.get("/attempt/:attemptId", checkRole(["Student"]), getQuizAttempt);
router.get("/:quizId/attempts", checkRole(["Student"]), getStudentQuizAttempts);

export default router;
