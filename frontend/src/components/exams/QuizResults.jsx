// frontend/src/components/exams/QuizResults.jsx
import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaTrophy,
  FaMedal,
  FaChartPie,
} from "react-icons/fa";
import axios from "axios";

const API_BASE_URL = "http://localhost:5555/api";

const QuizResults = () => {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Get results from location state if available
  const resultData = location.state;

  const [quiz, setQuiz] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we have result data from navigation state, use it
    if (resultData) {
      setAttemptDetails(resultData);
      setLoading(false);
    }

    // Still fetch the quiz details for additional info
    fetchQuizDetails();
  }, [quizId, resultData]);

  const fetchQuizDetails = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_BASE_URL}/quizzes/${quizId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setQuiz(response.data);

      // If we don't have result data from navigation state,
      // fetch the most recent attempt
      if (!resultData) {
        fetchLatestAttempt();
      }
    } catch (err) {
      console.error("Error fetching quiz details:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load quiz details. Please try again later."
      );
      setLoading(false);
    }
  };

  const fetchLatestAttempt = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_BASE_URL}/quizzes/${quizId}/attempts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Find the most recent completed attempt
      const completedAttempts = response.data.filter(
        (a) => a.status === "completed"
      );

      if (completedAttempts.length > 0) {
        // Sort by date (most recent first)
        completedAttempts.sort(
          (a, b) => new Date(b.endTime) - new Date(a.endTime)
        );

        const latestAttempt = completedAttempts[0];
        setAttemptDetails({
          score: latestAttempt.score,
          maxScore: latestAttempt.maxScore,
          percentageScore: Math.round(
            (latestAttempt.score / latestAttempt.maxScore) * 100
          ),
        });
      } else {
        setError("No completed attempts found for this quiz.");
      }
    } catch (err) {
      console.error("Error fetching attempt details:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load attempt details. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const getResultFeedback = (percentage) => {
    if (percentage >= 90) {
      return {
        icon: <FaTrophy className="feedback-icon excellent" />,
        title: "Excellent!",
        message:
          "Outstanding performance! You have a thorough understanding of the material.",
      };
    } else if (percentage >= 75) {
      return {
        icon: <FaMedal className="feedback-icon good" />,
        title: "Good Job!",
        message: "Great work! You have a solid grasp of most concepts.",
      };
    } else if (percentage >= 60) {
      return {
        icon: <FaCheckCircle className="feedback-icon passing" />,
        title: "Passed!",
        message:
          "You passed the quiz. Review areas where you lost points to improve further.",
      };
    } else {
      return {
        icon: <FaTimesCircle className="feedback-icon needs-improvement" />,
        title: "Needs Improvement",
        message:
          "You didn't pass this time. Review the material and try again.",
      };
    }
  };

  const goBack = () => {
    // Navigate back to student dashboard or exam list
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="quiz-results-container">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-results-container">
        <div className="results-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={goBack}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!attemptDetails) {
    return (
      <div className="quiz-results-container">
        <div className="results-error">
          <h2>No Results Available</h2>
          <p>We couldn't find any completed attempts for this quiz.</p>
          <button className="btn-primary" onClick={goBack}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const feedback = getResultFeedback(attemptDetails.percentageScore);

  return (
    <div className="quiz-results-container">
      <div className="results-header">
        <button className="btn-back" onClick={goBack}>
          <FaArrowLeft /> Back to Dashboard
        </button>
        <h2>Quiz Results</h2>
      </div>

      <div className="results-content">
        <div className="quiz-info">
          <h3>{quiz?.title || "Quiz Results"}</h3>
          <p>{quiz?.description}</p>
        </div>

        <div className="results-summary">
          {feedback.icon}
          <h2 className="results-title">{feedback.title}</h2>
          <p className="results-message">{feedback.message}</p>

          <div className="score-details">
            <div className="score-item">
              <span className="score-label">Your Score</span>
              <span className="score-value">
                {attemptDetails.score} / {attemptDetails.maxScore}
              </span>
            </div>
            <div className="score-item">
              <span className="score-label">Percentage</span>
              <span className="score-value">
                {attemptDetails.percentageScore}%
              </span>
            </div>
          </div>

          <div className="score-gauge">
            <div
              className="gauge-fill"
              style={{
                width: `${attemptDetails.percentageScore}%`,
                backgroundColor:
                  attemptDetails.percentageScore >= 90
                    ? "#4CAF50"
                    : attemptDetails.percentageScore >= 75
                    ? "#8BC34A"
                    : attemptDetails.percentageScore >= 60
                    ? "#FFC107"
                    : "#F44336",
              }}
            ></div>
          </div>
        </div>

        <div className="results-actions">
          <button className="btn-primary" onClick={goBack}>
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
