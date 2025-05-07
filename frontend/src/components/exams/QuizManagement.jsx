import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaTimes,
  FaEdit,
  FaTrashAlt,
  FaToggleOn,
  FaToggleOff,
  FaChevronDown,
  FaChevronUp,
  FaCheckSquare,
  FaSquare,
  FaQuestionCircle,
  FaCheck,
  FaSave,
} from "react-icons/fa";
import axios from "axios";

const API_BASE_URL = "http://localhost:5555/api";

const QuizManagement = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [showAddQuizForm, setShowAddQuizForm] = useState(false);
  const [showEditQuizForm, setShowEditQuizForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [currentQuiz, setCurrentQuiz] = useState(null);

  // Question view states
  const [expandedQuiz, setExpandedQuiz] = useState(null);

  // New quiz form data
  const [quizFormData, setQuizFormData] = useState({
    title: "",
    description: "",
    timeLimit: 30,
    questions: [],
  });

  // Temporary new question state
  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    questionType: "multiple-choice",
    options: [
      { text: "Option A", isCorrect: false },
      { text: "Option B", isCorrect: false },
      { text: "Option C", isCorrect: false },
      { text: "Option D", isCorrect: false },
    ],
    correctAnswer: "",
    points: 1,
  });

  useEffect(() => {
    // Fetch exam details
    fetchExamDetails();
    // Fetch quizzes for this exam
    fetchQuizzes();
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/exams/${examId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setExam(response.data);
    } catch (err) {
      console.error("Error fetching exam details:", err);
      setError("Failed to load exam details. Please try again later.");
    }
  };

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/quizzes/exam/${examId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setQuizzes(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      setError("Failed to load quizzes. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizInputChange = (e) => {
    const { name, value } = e.target;
    setQuizFormData({
      ...quizFormData,
      [name]: value,
    });
  };

  const handleQuestionInputChange = (e) => {
    const { name, value } = e.target;
    setNewQuestion({
      ...newQuestion,
      [name]: value,
    });
  };

  const handleOptionChange = (index, field, value) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value,
    };

    setNewQuestion({
      ...newQuestion,
      options: updatedOptions,
    });
  };

  const handleCorrectOptionToggle = (index) => {
    // For multiple choice questions, toggle the correct option
    if (newQuestion.questionType === "multiple-choice") {
      const updatedOptions = newQuestion.options.map((option, i) => ({
        ...option,
        isCorrect: i === index ? !option.isCorrect : option.isCorrect,
      }));

      setNewQuestion({
        ...newQuestion,
        options: updatedOptions,
      });
    }
  };

  const addQuestionToForm = () => {
    // Validate question before adding
    if (!newQuestion.questionText.trim()) {
      alert("Please enter a question text");
      return;
    }

    if (newQuestion.questionType === "multiple-choice") {
      const hasCorrectOption = newQuestion.options.some(
        (option) => option.isCorrect
      );
      if (!hasCorrectOption) {
        alert("Please select at least one correct option");
        return;
      }

      // Check if all options have text
      const emptyOption = newQuestion.options.find(
        (option) => !option.text.trim()
      );
      if (emptyOption) {
        alert("Please fill in all option texts");
        return;
      }
    } else if (!newQuestion.correctAnswer.trim()) {
      alert("Please enter the correct answer");
      return;
    }

    // Add question to form data
    setQuizFormData({
      ...quizFormData,
      questions: [...quizFormData.questions, { ...newQuestion }],
    });

    // Reset new question form
    setNewQuestion({
      questionText: "",
      questionType: "multiple-choice",
      options: [
        { text: "Option A", isCorrect: false },
        { text: "Option B", isCorrect: false },
        { text: "Option C", isCorrect: false },
        { text: "Option D", isCorrect: false },
      ],
      correctAnswer: "",
      points: 1,
    });
  };

  const removeQuestion = (index) => {
    const updatedQuestions = [...quizFormData.questions];
    updatedQuestions.splice(index, 1);
    setQuizFormData({
      ...quizFormData,
      questions: updatedQuestions,
    });
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();

    // Validate form
    if (!quizFormData.title.trim()) {
      setFormError("Quiz title is required");
      return;
    }

    if (!quizFormData.description.trim()) {
      setFormError("Quiz description is required");
      return;
    }

    if (quizFormData.questions.length === 0) {
      setFormError("Please add at least one question");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const token = localStorage.getItem("token");

      // Create the quiz
      const response = await axios.post(
        `${API_BASE_URL}/quizzes`,
        {
          ...quizFormData,
          examId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Add the new quiz to the quizzes state
      setQuizzes([...quizzes, response.data.quiz]);

      // Reset form data
      setQuizFormData({
        title: "",
        description: "",
        timeLimit: 30,
        questions: [],
      });

      // Close the form
      setShowAddQuizForm(false);

      alert("Quiz created successfully");
    } catch (err) {
      console.error("Error creating quiz:", err);
      setFormError(
        err.response?.data?.message ||
          "Failed to create quiz. Please try again."
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setQuizFormData({
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      questions: quiz.questions.map((q) => ({
        ...q,
        // Ensure properties are correctly formatted
        questionType: q.questionType || "multiple-choice",
        options: q.options || [],
        correctAnswer: q.correctAnswer || "",
        points: q.points || 1,
      })),
    });
    setShowEditQuizForm(true);
  };

  const handleUpdateQuiz = async (e) => {
    e.preventDefault();

    // Similar validation as handleCreateQuiz
    if (
      !quizFormData.title.trim() ||
      !quizFormData.description.trim() ||
      quizFormData.questions.length === 0
    ) {
      setFormError(
        "Please fill all required fields and add at least one question"
      );
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const token = localStorage.getItem("token");

      // Update the quiz
      const response = await axios.put(
        `${API_BASE_URL}/quizzes/${currentQuiz._id}`,
        quizFormData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update the quizzes state
      setQuizzes(
        quizzes.map((quiz) =>
          quiz._id === currentQuiz._id ? response.data.quiz : quiz
        )
      );

      // Close the form
      setShowEditQuizForm(false);

      alert("Quiz updated successfully");
    } catch (err) {
      console.error("Error updating quiz:", err);
      setFormError(
        err.response?.data?.message ||
          "Failed to update quiz. Please try again."
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this quiz? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.delete(`${API_BASE_URL}/quizzes/${quizId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Remove the quiz from the quizzes state
      setQuizzes(quizzes.filter((quiz) => quiz._id !== quizId));

      alert("Quiz deleted successfully");
    } catch (err) {
      console.error("Error deleting quiz:", err);
      alert(
        err.response?.data?.message ||
          "Failed to delete quiz. Please try again."
      );
    }
  };

  const handleToggleActiveStatus = async (quizId) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.patch(
        `${API_BASE_URL}/quizzes/${quizId}/toggle-active`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update the quizzes state
      setQuizzes(
        quizzes.map((quiz) => (quiz._id === quizId ? response.data.quiz : quiz))
      );

      alert(
        `Quiz is now ${response.data.quiz.isActive ? "active" : "inactive"}`
      );
    } catch (err) {
      console.error("Error toggling quiz status:", err);
      alert(
        err.response?.data?.message ||
          "Failed to update quiz status. Please try again."
      );
    }
  };

  const toggleExpandQuiz = (quizId) => {
    setExpandedQuiz(expandedQuiz === quizId ? null : quizId);
  };

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="quiz-management-container">
      <div className="page-header">
        <button className="btn-back" onClick={goBack}>
          <FaTimes /> Back to Exam
        </button>
        <h1>Manage Quizzes for {exam?.title || "Exam"}</h1>
      </div>

      <div className="page-actions">
        <button
          className="btn-primary"
          onClick={() => setShowAddQuizForm(true)}
        >
          <FaPlus className="icon-left" /> Add New Quiz
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading quizzes...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : quizzes.length === 0 ? (
        <div className="no-data-message">
          <p>No quizzes have been created for this exam yet.</p>
          <p>Click the "Add New Quiz" button to create your first quiz.</p>
        </div>
      ) : (
        <div className="quizzes-list">
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="quiz-card">
              <div className="quiz-header">
                <div className="quiz-title-section">
                  <h3>{quiz.title}</h3>
                  <span
                    className={`status-badge ${
                      quiz.isActive ? "active" : "inactive"
                    }`}
                  >
                    {quiz.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="quiz-actions">
                  <button
                    className="btn-icon"
                    onClick={() =>
                      handleToggleActiveStatus(quiz._id, quiz.isActive)
                    }
                    title={quiz.isActive ? "Deactivate Quiz" : "Activate Quiz"}
                  >
                    {quiz.isActive ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleEditQuiz(quiz)}
                    title="Edit Quiz"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="btn-icon danger"
                    onClick={() => handleDeleteQuiz(quiz._id)}
                    title="Delete Quiz"
                  >
                    <FaTrashAlt />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => toggleExpandQuiz(quiz._id)}
                    title={expandedQuiz === quiz._id ? "Collapse" : "Expand"}
                  >
                    {expandedQuiz === quiz._id ? (
                      <FaChevronUp />
                    ) : (
                      <FaChevronDown />
                    )}
                  </button>
                </div>
              </div>

              <div className="quiz-meta">
                <p>{quiz.description}</p>
                <div className="quiz-details">
                  <span>Time Limit: {quiz.timeLimit} minutes</span>
                  <span>Questions: {quiz.questions.length}</span>
                  <span>
                    Total Points:{" "}
                    {quiz.questions.reduce((sum, q) => sum + q.points, 0)}
                  </span>
                </div>
              </div>

              {expandedQuiz === quiz._id && (
                <div className="quiz-questions">
                  <h4>Questions</h4>
                  {quiz.questions.map((question, qIndex) => (
                    <div key={qIndex} className="question-item">
                      <div className="question-header">
                        <span className="question-number">Q{qIndex + 1}.</span>
                        <span className="question-text">
                          {question.questionText}
                        </span>
                        <span className="question-points">
                          {question.points}{" "}
                          {question.points === 1 ? "point" : "points"}
                        </span>
                      </div>

                      {question.questionType === "multiple-choice" ? (
                        <div className="question-options">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="option-item">
                              {option.isCorrect ? (
                                <FaCheckSquare className="correct-icon" />
                              ) : (
                                <FaSquare />
                              )}
                              <span>{option.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="correct-answer">
                          <strong>Correct Answer:</strong>{" "}
                          {question.correctAnswer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Quiz Form Modal */}
      {showAddQuizForm && (
        <div className="modal-overlay">
          <div className="modal-content quiz-form-modal">
            <div className="modal-header">
              <h3>Add New Quiz</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddQuizForm(false)}
              >
                <FaTimes />
              </button>
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <form onSubmit={handleCreateQuiz} className="quiz-form">
              <div className="form-group">
                <label htmlFor="title">Quiz Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={quizFormData.title}
                  onChange={handleQuizInputChange}
                  required
                  placeholder="Enter quiz title"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={quizFormData.description}
                  onChange={handleQuizInputChange}
                  required
                  placeholder="Enter quiz description"
                  rows="3"
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="timeLimit">Time Limit (minutes)</label>
                <input
                  type="number"
                  id="timeLimit"
                  name="timeLimit"
                  value={quizFormData.timeLimit}
                  onChange={handleQuizInputChange}
                  required
                  min="1"
                  max="180"
                />
              </div>

              <div className="questions-section">
                <h4>Questions</h4>

                {quizFormData.questions.length > 0 ? (
                  <div className="questions-list">
                    {quizFormData.questions.map((question, index) => (
                      <div key={index} className="question-preview">
                        <div className="question-preview-header">
                          <span className="question-number">Q{index + 1}.</span>
                          <span className="question-text">
                            {question.questionText}
                          </span>
                          <button
                            type="button"
                            className="btn-icon danger"
                            onClick={() => removeQuestion(index)}
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-questions">No questions added yet.</p>
                )}

                <div className="add-question-section">
                  <h4>Add New Question</h4>

                  <div className="form-group">
                    <label htmlFor="questionText">Question Text</label>
                    <textarea
                      id="questionText"
                      name="questionText"
                      value={newQuestion.questionText}
                      onChange={handleQuestionInputChange}
                      placeholder="Enter question text"
                      rows="2"
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label htmlFor="questionType">Question Type</label>
                    <select
                      id="questionType"
                      name="questionType"
                      value={newQuestion.questionType}
                      onChange={handleQuestionInputChange}
                    >
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="true-false">True/False</option>
                      <option value="short-answer">Short Answer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="points">Points</label>
                    <input
                      type="number"
                      id="points"
                      name="points"
                      value={newQuestion.points}
                      onChange={handleQuestionInputChange}
                      min="1"
                      max="100"
                    />
                  </div>

                  {newQuestion.questionType === "multiple-choice" ? (
                    <div className="options-section">
                      <label>Options (select correct options)</label>
                      {newQuestion.options.map((option, index) => (
                        <div key={index} className="option-row">
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) =>
                              handleOptionChange(index, "text", e.target.value)
                            }
                            placeholder={`Option ${index + 1}`}
                          />
                          <button
                            type="button"
                            className={`option-correct-toggle ${
                              option.isCorrect ? "selected" : ""
                            }`}
                            onClick={() => handleCorrectOptionToggle(index)}
                          >
                            {option.isCorrect ? (
                              <FaCheckSquare />
                            ) : (
                              <FaSquare />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="form-group">
                      <label htmlFor="correctAnswer">Correct Answer</label>
                      <input
                        type="text"
                        id="correctAnswer"
                        name="correctAnswer"
                        value={newQuestion.correctAnswer}
                        onChange={handleQuestionInputChange}
                        placeholder="Enter the correct answer"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={addQuestionToForm}
                  >
                    <FaPlus className="icon-left" /> Add Question
                  </button>

                  {/* New button added at the bottom of add question section */}
                  <div className="add-question-bottom-actions">
                    <button
                      type="button"
                      className="btn-primary add-question-bottom-btn"
                      onClick={addQuestionToForm}
                    >
                      <FaSave className="icon-left" /> Save Question
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddQuizForm(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {formSubmitting ? "Creating..." : "Create Quiz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Quiz Form Modal - Similar to Add but with update functionality */}
      {showEditQuizForm && currentQuiz && (
        <div className="modal-overlay">
          <div className="modal-content quiz-form-modal">
            <div className="modal-header">
              <h3>Edit Quiz</h3>
              <button
                className="close-btn"
                onClick={() => setShowEditQuizForm(false)}
              >
                <FaTimes />
              </button>
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <form onSubmit={handleUpdateQuiz} className="quiz-form">
              {/* Same form fields as Add Quiz form, but with update functionality */}
              <div className="form-group">
                <label htmlFor="edit-title">Quiz Title</label>
                <input
                  type="text"
                  id="edit-title"
                  name="title"
                  value={quizFormData.title}
                  onChange={handleQuizInputChange}
                  required
                  placeholder="Enter quiz title"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={quizFormData.description}
                  onChange={handleQuizInputChange}
                  required
                  placeholder="Enter quiz description"
                  rows="3"
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="edit-timeLimit">Time Limit (minutes)</label>
                <input
                  type="number"
                  id="edit-timeLimit"
                  name="timeLimit"
                  value={quizFormData.timeLimit}
                  onChange={handleQuizInputChange}
                  required
                  min="1"
                  max="180"
                />
              </div>

              <div className="questions-section">
                <h4>Questions ({quizFormData.questions.length})</h4>

                {quizFormData.questions.length > 0 ? (
                  <div className="questions-list">
                    {quizFormData.questions.map((question, index) => (
                      <div key={index} className="question-preview">
                        <div className="question-preview-header">
                          <span className="question-number">Q{index + 1}.</span>
                          <span className="question-text">
                            {question.questionText}
                          </span>
                          <button
                            type="button"
                            className="btn-icon danger"
                            onClick={() => removeQuestion(index)}
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-questions">No questions added yet.</p>
                )}

                {/* Same Add Question section as in Add Quiz form */}
                <div className="add-question-section">
                  <h4>Add New Question</h4>

                  <div className="form-group">
                    <label htmlFor="edit-questionText">Question Text</label>
                    <textarea
                      id="edit-questionText"
                      name="questionText"
                      value={newQuestion.questionText}
                      onChange={handleQuestionInputChange}
                      placeholder="Enter question text"
                      rows="2"
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-questionType">Question Type</label>
                    <select
                      id="edit-questionType"
                      name="questionType"
                      value={newQuestion.questionType}
                      onChange={handleQuestionInputChange}
                    >
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="true-false">True/False</option>
                      <option value="short-answer">Short Answer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-points">Points</label>
                    <input
                      type="number"
                      id="edit-points"
                      name="points"
                      value={newQuestion.points}
                      onChange={handleQuestionInputChange}
                      min="1"
                      max="100"
                    />
                  </div>

                  {newQuestion.questionType === "multiple-choice" ? (
                    <div className="options-section">
                      <label>Options (select correct options)</label>
                      {newQuestion.options.map((option, index) => (
                        <div key={index} className="option-row">
                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) =>
                              handleOptionChange(index, "text", e.target.value)
                            }
                            placeholder={`Option ${index + 1}`}
                          />
                          <button
                            type="button"
                            className={`option-correct-toggle ${
                              option.isCorrect ? "selected" : ""
                            }`}
                            onClick={() => handleCorrectOptionToggle(index)}
                          >
                            {option.isCorrect ? (
                              <FaCheckSquare />
                            ) : (
                              <FaSquare />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="form-group">
                      <label htmlFor="edit-correctAnswer">Correct Answer</label>
                      <input
                        type="text"
                        id="edit-correctAnswer"
                        name="correctAnswer"
                        value={newQuestion.correctAnswer}
                        onChange={handleQuestionInputChange}
                        placeholder="Enter the correct answer"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={addQuestionToForm}
                  >
                    <FaPlus className="icon-left" /> Add Question
                  </button>

                  {/* New button added at the bottom of add question section in edit form */}
                  <div className="add-question-bottom-actions">
                    <button
                      type="button"
                      className="btn-primary add-question-bottom-btn"
                      onClick={addQuestionToForm}
                    >
                      <FaSave className="icon-left" /> Save Question
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowEditQuizForm(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    formSubmitting || quizFormData.questions.length === 0
                  }
                >
                  {formSubmitting ? "Updating..." : "Update Quiz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizManagement;
