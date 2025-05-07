import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true,
  },
  questionType: {
    type: String,
    enum: ["multiple-choice", "true-false", "short-answer"],
    default: "multiple-choice",
    required: true,
  },
  options: [
    {
      text: String,
      isCorrect: Boolean,
    },
  ],
  correctAnswer: {
    type: String,
    // Required for true-false and short-answer questions
    required: function () {
      return this.questionType !== "multiple-choice";
    },
  },
  points: {
    type: Number,
    default: 1,
    min: 0,
  },
});

const quizSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    timeLimit: {
      type: Number, // in minutes
      required: true,
      min: 1,
    },
    questions: [questionSchema],
    isActive: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Quiz", quizSchema);
