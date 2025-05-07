import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  selectedOptions: [
    {
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
  textAnswer: {
    type: String,
    trim: true,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  pointsAwarded: {
    type: Number,
    default: 0,
  },
});

const quizAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    answers: [answerSchema],
    score: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["in-progress", "completed", "timed-out"],
      default: "in-progress",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("QuizAttempt", quizAttemptSchema);
