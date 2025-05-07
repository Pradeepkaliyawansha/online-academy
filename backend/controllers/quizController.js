import Quiz from "../models/Quiz.js";
import Exam from "../models/Exam.js";
import QuizAttempt from "../models/QuizAttempt.js";

// Get all quizzes for an exam
export const getQuizzesByExam = async (req, res) => {
  try {
    const { examId } = req.params;

    // For students, only return active quizzes
    const filter = {
      examId,
      ...(req.user?.role === "Student" && { isActive: true }),
    };

    const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });

    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching quizzes",
      error: error.message,
    });
  }
};

// Get a single quiz by ID
export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if student is trying to access an inactive quiz
    if (req.user?.role === "Student" && !quiz.isActive) {
      return res.status(403).json({
        success: false,
        message: "Access denied: This quiz is not currently active",
      });
    }

    // For students, don't send the correct answers
    if (req.user?.role === "Student") {
      const safeQuiz = { ...quiz.toObject() };

      // Remove correct answers from questions
      safeQuiz.questions = safeQuiz.questions.map((question) => {
        const safeQuestion = { ...question };

        if (safeQuestion.questionType === "multiple-choice") {
          safeQuestion.options = safeQuestion.options.map((option) => ({
            _id: option._id,
            text: option.text,
          }));
        } else {
          delete safeQuestion.correctAnswer;
        }

        return safeQuestion;
      });

      return res.status(200).json(safeQuiz);
    }

    res.status(200).json(quiz);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching quiz",
      error: error.message,
    });
  }
};

// Create a new quiz - FIXED FUNCTION
export const createQuiz = async (req, res) => {
  try {
    // Verify the exam exists
    const exam = await Exam.findById(req.body.examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Add the current user as creator
    // Try multiple possible ID properties to ensure compatibility
    const quizData = {
      ...req.body,
      createdBy: req.user?.userId || req.user?._id || req.user?.id,
    };

    console.log("Creating quiz with data:", JSON.stringify(quizData)); // Debug log

    const newQuiz = new Quiz(quizData);
    const savedQuiz = await newQuiz.save();

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      quiz: savedQuiz,
    });
  } catch (error) {
    console.error("Quiz creation error:", error); // Better error logging
    res.status(500).json({
      success: false,
      message: "Error creating quiz",
      error: error.message,
    });
  }
};

// Update a quiz
export const updateQuiz = async (req, res) => {
  try {
    // Check if quiz exists
    const quizExists = await Quiz.findById(req.params.id);
    if (!quizExists) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Update the quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
      quiz: updatedQuiz,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating quiz",
      error: error.message,
    });
  }
};

// Delete a quiz
export const deleteQuiz = async (req, res) => {
  try {
    const quizToDelete = await Quiz.findById(req.params.id);

    if (!quizToDelete) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    await Quiz.findByIdAndDelete(req.params.id);

    // Also delete any attempts associated with this quiz
    await QuizAttempt.deleteMany({ quizId: req.params.id });

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting quiz",
      error: error.message,
    });
  }
};

// Toggle quiz active status
export const toggleQuizActive = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Toggle the active status
    quiz.isActive = !quiz.isActive;
    await quiz.save();

    res.status(200).json({
      success: true,
      message: `Quiz is now ${quiz.isActive ? "active" : "inactive"}`,
      quiz,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating quiz status",
      error: error.message,
    });
  }
};

// Start a quiz attempt for a student
export const startQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Verify the quiz exists and is active
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    if (!quiz.isActive) {
      return res.status(403).json({
        success: false,
        message: "This quiz is not currently active",
      });
    }

    // Check if there's already an in-progress attempt
    const existingAttempt = await QuizAttempt.findOne({
      studentId: req.user._id,
      quizId,
      status: "in-progress",
    });

    if (existingAttempt) {
      return res.status(200).json({
        success: true,
        message: "Continuing existing attempt",
        attempt: existingAttempt,
      });
    }

    // Calculate max score
    const maxScore = quiz.questions.reduce((total, q) => total + q.points, 0);

    // Create a new attempt
    const newAttempt = new QuizAttempt({
      studentId: req.user._id,
      examId: quiz.examId,
      quizId,
      maxScore,
      startTime: new Date(),
    });

    const savedAttempt = await newAttempt.save();

    res.status(201).json({
      success: true,
      message: "Quiz attempt started",
      attempt: savedAttempt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error starting quiz attempt",
      error: error.message,
    });
  }
};

// Submit answers for a question in a quiz attempt
export const submitAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedOptions, textAnswer } = req.body;

    // Verify the attempt exists and belongs to the student
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      studentId: req.user._id,
      status: "in-progress",
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Active attempt not found",
      });
    }

    // Get the quiz to check correct answers
    const quiz = await Quiz.findById(attempt.quizId);

    // Find the question
    const question = quiz.questions.find(
      (q) => q._id.toString() === questionId
    );
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found in quiz",
      });
    }

    // Determine if the answer is correct and calculate points
    let isCorrect = false;
    let pointsAwarded = 0;

    if (question.questionType === "multiple-choice") {
      // Check if selected options match correct options
      const correctOptionIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o._id.toString());

      // Sort both arrays for comparison
      const sortedSelected = [...selectedOptions].sort();
      const sortedCorrect = [...correctOptionIds].sort();

      isCorrect =
        JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);

      if (isCorrect) {
        pointsAwarded = question.points;
      }
    } else {
      // For true-false and short-answer
      isCorrect =
        textAnswer.toLowerCase().trim() ===
        question.correctAnswer.toLowerCase().trim();
      if (isCorrect) {
        pointsAwarded = question.points;
      }
    }

    // Add or update the answer in the attempt
    const existingAnswerIndex = attempt.answers.findIndex(
      (a) => a.questionId.toString() === questionId
    );

    const newAnswer = {
      questionId,
      selectedOptions,
      textAnswer,
      isCorrect,
      pointsAwarded,
    };

    if (existingAnswerIndex >= 0) {
      // Update existing answer
      attempt.answers[existingAnswerIndex] = newAnswer;
    } else {
      // Add new answer
      attempt.answers.push(newAnswer);
    }

    // Recalculate total score
    attempt.score = attempt.answers.reduce(
      (total, a) => total + a.pointsAwarded,
      0
    );

    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Answer submitted",
      answer: newAnswer,
      currentScore: attempt.score,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting answer",
      error: error.message,
    });
  }
};

// Complete a quiz attempt
export const completeQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Verify the attempt exists and belongs to the student
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      studentId: req.user._id,
      status: "in-progress",
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Active attempt not found",
      });
    }

    // Update attempt status
    attempt.status = "completed";
    attempt.endTime = new Date();

    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Quiz attempt completed",
      attempt: {
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentageScore: Math.round((attempt.score / attempt.maxScore) * 100),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error completing quiz attempt",
      error: error.message,
    });
  }
};

// Get quiz attempt for a student
export const getQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Verify the attempt exists and belongs to the student
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      studentId: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    res.status(200).json(attempt);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching quiz attempt",
      error: error.message,
    });
  }
};

// Get all attempts for a student on a quiz
export const getStudentQuizAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;

    const attempts = await QuizAttempt.find({
      studentId: req.user._id,
      quizId,
    }).sort({ createdAt: -1 });

    res.status(200).json(attempts);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching quiz attempts",
      error: error.message,
    });
  }
};

// Get quiz results (for instructors)
export const getQuizResults = async (req, res) => {
  try {
    const { quizId } = req.params;

    const attempts = await QuizAttempt.find({
      quizId,
      status: "completed",
    }).populate("studentId", "name email");

    const results = attempts.map((attempt) => ({
      studentName: attempt.studentId.name,
      studentEmail: attempt.studentId.email,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentageScore: Math.round((attempt.score / attempt.maxScore) * 100),
      submittedAt: attempt.endTime,
    }));

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching quiz results",
      error: error.message,
    });
  }
};
