// frontend/src/components/exams/QuizTaking.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaSquare,
  FaCheckSquare,
  FaClock,
  FaExclamationTriangle,
  FaFlag,
} from "react-icons/fa";
import axios from "axios";

const API_BASE_URL = "http://localhost:5555/api";

const QuizTaking = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);

  // Form states for answers
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [submittingFinalAnswers, setSubmittingFinalAnswers] = useState(false);

  // For timer
  const timerRef = useRef(null);

  useEffect(() => {
    // Load quiz and start attempt
    fetchQuizAndStartAttempt();

    // Cleanup function to handle leaving the page
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizId]);

  const fetchQuizAndStartAttempt = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch quiz details
      const quizResponse = await axios.get(
        `${API_BASE_URL}/quizzes/${quizId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setQuiz(quizResponse.data);

      // Start a new attempt
      const attemptResponse = await axios.post(
        `${API_BASE_URL}/quizzes/${quizId}/attempt`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAttempt(attemptResponse.data.attempt);

      // Initialize remaining time based on quiz time limit
      const timeLimit = quizResponse.data.timeLimit * 60; // Convert to seconds
      const elapsedTime = attemptResponse.data.attempt.startTime
        ? Math.floor(
            (new Date() - new Date(attemptResponse.data.attempt.startTime)) /
              1000
          )
        : 0;

      const remaining = Math.max(0, timeLimit - elapsedTime);
      setRemainingTime(remaining);

      // Start the timer
      startTimer(remaining);

      setError(null);
    } catch (err) {
      console.error("Error fetching quiz or starting attempt:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load quiz. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (seconds) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      console.log(seconds);
    }

    // Start a new timer
    timerRef.current = setInterval(() => {
      setRemainingTime((prevTime) => {
        if (prevTime <= 1) {
          // Time's up - submit the quiz and clear interval
          clearInterval(timerRef.current);
          handleSubmitQuiz();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleOptionSelect = (optionId) => {
    // Toggle option selection for multiple choice
    setSelectedOptions((prevSelected) => {
      const optionIndex = prevSelected.indexOf(optionId);
      if (optionIndex === -1) {
        return [...prevSelected, optionId];
      } else {
        return prevSelected.filter((id) => id !== optionId);
      }
    });
  };

  const handleTextAnswerChange = (e) => {
    setTextAnswer(e.target.value);
  };

  const handleSubmitAnswer = async () => {
    if (!quiz || !attempt) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Validation - don't allow empty answers
    if (
      currentQuestion.questionType === "multiple-choice" &&
      selectedOptions.length === 0
    ) {
      alert("Please select at least one option.");
      return;
    } else if (
      currentQuestion.questionType !== "multiple-choice" &&
      !textAnswer.trim()
    ) {
      alert("Please enter your answer.");
      return;
    }

    setAnswerSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/quizzes/attempt/${attempt._id}/submit`,
        {
          questionId: currentQuestion._id,
          selectedOptions,
          textAnswer,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Move to next question if available
      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);

        // Reset answer states
        setSelectedOptions([]);
        setTextAnswer("");
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
      alert(
        err.response?.data?.message ||
          "Failed to submit answer. Please try again."
      );
    } finally {
      setAnswerSubmitting(false);
    }
  };

  const handleFlagQuestion = () => {
    // Toggle flag status for current question
    const questionId = quiz.questions[currentQuestionIndex]?._id;
    if (!questionId) return;

    setFlaggedQuestions((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const navigateToQuestion = (index) => {
    if (index >= 0 && index < quiz?.questions.length) {
      // Save current answer first
      handleSubmitAnswer().then(() => {
        setCurrentQuestionIndex(index);

        // Load answer for the selected question
        const question = quiz.questions[index];
        const answer = attempt?.answers?.find(
          (a) => a.questionId === question._id
        );

        if (answer) {
          // Populate answer fields
          setSelectedOptions(answer.selectedOptions || []);
          setTextAnswer(answer.textAnswer || "");
        } else {
          // Reset answer fields
          setSelectedOptions([]);
          setTextAnswer("");
        }
      });
    }
  };

  const handleSubmitQuiz = async () => {
    if (!attempt) return;

    // Confirm before submitting
    if (
      !window.confirm(
        "Are you sure you want to submit the quiz? You cannot change your answers after submission."
      )
    ) {
      return;
    }

    setSubmittingFinalAnswers(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_BASE_URL}/quizzes/attempt/${attempt._id}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Navigate to results page with score data
      navigate(`/quiz/${quizId}/results`, {
        state: {
          score: response.data.attempt.score,
          maxScore: response.data.attempt.maxScore,
          percentageScore: response.data.attempt.percentageScore,
        },
      });
    } catch (err) {
      console.error("Error completing quiz:", err);
      alert(
        err.response?.data?.message ||
          "Failed to submit quiz. Please try again."
      );
      setSubmittingFinalAnswers(false);
    }
  };

  const goBack = () => {
    if (
      window.confirm(
        "Are you sure you want to exit? Your progress will be saved."
      )
    ) {
      navigate(-1);
    }
  };

  // If still loading, show loading spinner
  if (loading) {
    return (
      <div className="quiz-taking-container">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  // If there was an error, show error message
  if (error) {
    return (
      <div className="quiz-taking-container">
        <div className="quiz-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={goBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // If quiz or attempt is not loaded, show message
  if (!quiz || !attempt) {
    return (
      <div className="quiz-taking-container">
        <div className="quiz-error">
          <h2>Quiz Not Available</h2>
          <p>This quiz is not currently available or has been deactivated.</p>
          <button className="btn-primary" onClick={goBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="quiz-taking-container">
      <div className="quiz-header">
        <h2>{quiz.title}</h2>
        <div className="quiz-timer">
          <FaClock className="timer-icon" />
          <span className={remainingTime < 60 ? "time-low" : ""}>
            Time Remaining: {formatTime(remainingTime)}
          </span>
        </div>
      </div>

      <div className="quiz-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${(currentQuestionIndex / quiz.questions.length) * 100}%`,
            }}
          ></div>
        </div>
        <span className="progress-text">
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </span>
      </div>

      <div className="quiz-navigation">
        <button
          className="btn-secondary"
          onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <FaArrowLeft className="icon-left" /> Previous
        </button>
        <button
          className="btn-secondary"
          onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
          disabled={currentQuestionIndex === quiz.questions.length - 1}
        >
          Next <FaArrowRight className="icon-right" />
        </button>
      </div>

      <div className="question-container">
        <div className="question-header">
          <h3>
            <span className="question-number">
              Question {currentQuestionIndex + 1}:
            </span>
            {currentQuestion.questionText}
          </h3>
          <div className="question-actions">
            <button
              className={`btn-flag ${
                flaggedQuestions.includes(currentQuestion._id) ? "flagged" : ""
              }`}
              onClick={handleFlagQuestion}
              title="Flag this question for review"
            >
              <FaFlag />
            </button>
          </div>
        </div>

        <div className="question-body">
          {currentQuestion.questionType === "multiple-choice" ? (
            <div className="options-list">
              {currentQuestion.options.map((option) => (
                <div
                  key={option._id}
                  className={`option-item ${
                    selectedOptions.includes(option._id) ? "selected" : ""
                  }`}
                  onClick={() => handleOptionSelect(option._id)}
                >
                  {selectedOptions.includes(option._id) ? (
                    <FaCheckSquare className="option-icon" />
                  ) : (
                    <FaSquare className="option-icon" />
                  )}
                  <span className="option-text">{option.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-answer-container">
              <textarea
                value={textAnswer}
                onChange={handleTextAnswerChange}
                placeholder={`Enter your ${
                  currentQuestion.questionType === "true-false"
                    ? "true or false"
                    : "answer"
                }...`}
                rows="3"
              ></textarea>
            </div>
          )}
        </div>

        <div className="answer-actions">
          <button
            className="btn-primary"
            onClick={handleSubmitAnswer}
            disabled={answerSubmitting}
          >
            {answerSubmitting ? "Saving..." : "Save Answer"}
          </button>
        </div>
      </div>

      <div className="question-navigator">
        <h4>Question Navigator</h4>
        <div className="question-buttons">
          {quiz.questions.map((question, index) => {
            const questionId = question._id;
            const hasAnswer = attempt.answers?.some(
              (a) => a.questionId === questionId
            );
            const isFlagged = flaggedQuestions.includes(questionId);

            let className = "question-button";
            if (index === currentQuestionIndex) className += " current";
            if (hasAnswer) className += " answered";
            if (isFlagged) className += " flagged";

            return (
              <button
                key={index}
                className={className}
                onClick={() => navigateToQuestion(index)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="quiz-footer">
        <button className="btn-secondary" onClick={goBack}>
          Save & Exit
        </button>
        <button
          className="btn-primary submit-quiz"
          onClick={handleSubmitQuiz}
          disabled={submittingFinalAnswers}
        >
          {submittingFinalAnswers ? "Submitting..." : "Submit Quiz"}
        </button>
      </div>
    </div>
  );
};
export default QuizTaking;
