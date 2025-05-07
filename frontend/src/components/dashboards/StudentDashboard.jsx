import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../../contexts/AuthContext";
import "../../styles/Profile.css";
import Header from "../shared/Header";
import StudentProfile from "../profile/StudentProfile";
import {
  FaBook,
  FaClipboardList,
  FaCalendarAlt,
  FaTrophy,
  FaExternalLinkAlt,
  FaServer,
  FaGraduationCap,
  FaInfoCircle,
  FaShoppingCart,
  FaArrowLeft,
  FaHome,
  FaUser,
  FaPhone,
  FaIdCard,
  FaBirthdayCake,
  FaVenusMars,
  FaTimes,
  FaSave,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaEnvelope,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";

const API_BASE_URL = "http://localhost:5555/api";

// Custom hook for API calls with error handling and loading states
const useApiCall = (initialData = null) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (
    apiCall,
    fallbackData = null,
    errorMessage = "Failed to load data"
  ) => {
    setLoading(true);
    try {
      const isConnected = await checkServerConnection();
      if (!isConnected) {
        setError("Failed to connect to server");
        if (fallbackData) setData(fallbackData);
        return null;
      }

      const response = await apiCall();
      setData(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      console.error(errorMessage, err);
      setError(errorMessage);
      if (fallbackData) setData(fallbackData);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute, setData };
};

// Helper function to check server connection
const checkServerConnection = async () => {
  try {
    await axios.get(`${API_BASE_URL}/`, { timeout: 3000 });
    return true;
  } catch (err) {
    console.log("Server connection failed");
    return false;
  }
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const profileSectionRef = useRef(null);

  // Server status
  const [serverStatus, setServerStatus] = useState({
    connected: false,
    checking: true,
  });

  // UI state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [messages, setMessages] = useState(5);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileFormError, setProfileFormError] = useState(null);

  // Form state
  const [editProfileData, setEditProfileData] = useState({
    phoneNumber: "",
    nic: "",
    birthday: "",
    gender: "Male",
  });

  // API data using custom hooks
  const stats = useApiCall({
    enrolledCourses: 0,
    pendingAssignments: 0,
    upcomingExams: 0,
    completedCourses: 0,
  });

  const schedule = useApiCall([]);
  const courses = useApiCall([]);
  const exams = useApiCall([]);
  const quizzes = useApiCall([]);
  const quizAttempts = useApiCall([]);
  const studentInfo = useApiCall({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    nic: "",
    birthday: "",
    gender: "",
  });

  // Local storage for enrolled courses
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  // Check server connection periodically
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkServerConnection();
      setServerStatus({
        connected,
        checking: false,
      });
    };

    checkConnection();
    const serverCheckInterval = setInterval(() => {
      if (!serverStatus.connected) {
        checkConnection();
      }
    }, 60000);

    return () => clearInterval(serverCheckInterval);
  }, []);

  // Initial data loading
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Load stats
    stats.execute(
      () =>
        axios.get(`${API_BASE_URL}/students/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      null,
      "Failed to load stats"
    );

    // Load schedule
    schedule.execute(
      () =>
        axios.get(`${API_BASE_URL}/student/schedule`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      [],
      "Failed to load schedule"
    );

    // Load courses
    courses.execute(
      () =>
        axios.get(`${API_BASE_URL}/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      [],
      "Failed to load courses"
    );

    // Load student info
    studentInfo.execute(
      () =>
        axios.get(`${API_BASE_URL}/students/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      null,
      "Failed to load student information"
    );

    // Load enrolled courses from local storage
    fetchEnrolledCourses();
  }, []);

  // Load exams after enrolled courses are loaded
  useEffect(() => {
    if (enrolledCourses.length > 0) {
      fetchExams();
    }
  }, [enrolledCourses]);

  // Click outside profile dropdown handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showProfileDropdown &&
        !event.target.closest(".profile-dropdown-container")
      ) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileDropdown]);

  // Fetch enrolled courses from local storage
  const fetchEnrolledCourses = () => {
    try {
      const storedEnrollments = JSON.parse(
        localStorage.getItem("courseEnrollments") || "[]"
      );

      if (storedEnrollments.length > 0) {
        setEnrolledCourses(storedEnrollments);
        stats.setData((prevStats) => ({
          ...prevStats,
          enrolledCourses: storedEnrollments.length,
        }));
      }
    } catch (err) {
      console.error("Error fetching enrolled courses:", err);
    }
  };

  // Fetch exams for enrolled courses
  const fetchExams = async () => {
    const token = localStorage.getItem("token");

    await exams.execute(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/exams`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Filter exams for enrolled courses
        const allExams = response.data;
        const enrolledCourseNames = enrolledCourses.map((course) =>
          course.courseName.toLowerCase().trim()
        );

        const filteredExams = allExams.filter((exam) =>
          enrolledCourseNames.includes(exam.course.toLowerCase().trim())
        );

        return { data: filteredExams };
      },
      [],
      "Failed to load exams"
    );

    if (exams.data && exams.data.length > 0) {
      fetchQuizzesForExams(exams.data);
    }
  };

  // Fetch quizzes for exams
  const fetchQuizzesForExams = async (examsList) => {
    const token = localStorage.getItem("token");

    try {
      const quizPromises = examsList.map((exam) =>
        axios.get(`${API_BASE_URL}/quizzes/exam/${exam._id || exam.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      const quizResponses = await Promise.all(quizPromises);

      // Combine all quiz results with exam information
      let allQuizzes = [];
      quizResponses.forEach((response, index) => {
        const examId = examsList[index]._id || examsList[index].id;
        const examTitle = examsList[index].title;
        const examCourse = examsList[index].course;

        const quizzesWithExamInfo = response.data.map((quiz) => ({
          ...quiz,
          examId: examId,
          examTitle: examTitle,
          examCourse: examCourse,
        }));

        allQuizzes = [...allQuizzes, ...quizzesWithExamInfo];
      });

      quizzes.setData(allQuizzes);

      // Fetch attempts for these quizzes
      fetchQuizAttempts(allQuizzes);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    }
  };

  // Fetch quiz attempts
  const fetchQuizAttempts = async (quizzesList) => {
    const token = localStorage.getItem("token");

    try {
      const attemptPromises = quizzesList.map((quiz) =>
        axios.get(`${API_BASE_URL}/quizzes/${quiz._id || quiz.id}/attempts`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      const attemptResponses = await Promise.all(attemptPromises);

      // Combine all attempt results
      let allAttempts = [];
      attemptResponses.forEach((response) => {
        allAttempts = [...allAttempts, ...response.data];
      });

      quizAttempts.setData(allAttempts);
    } catch (err) {
      console.error("Error fetching quiz attempts:", err);
    }
  };

  // Helper functions
  const getExamForQuiz = (quizId) => {
    const quiz = quizzes.data?.find((q) => q._id === quizId || q.id === quizId);
    if (!quiz) return null;

    return exams.data?.find(
      (e) => e._id === quiz.examId || e.id === quiz.examId
    );
  };

  const hasAttemptedQuiz = (quizId) => {
    return quizAttempts.data?.some(
      (attempt) =>
        attempt.quizId === quizId &&
        (attempt.status === "completed" || attempt.status === "in-progress")
    );
  };

  const getQuizAttempt = (quizId) => {
    const attempts =
      quizAttempts.data?.filter((attempt) => attempt.quizId === quizId) || [];

    if (attempts.length === 0) return null;

    // Sort by date, most recent first
    attempts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return attempts[0];
  };

  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getFullName = () => {
    if (currentUser?.name) return currentUser.name;

    const { firstName, lastName } = studentInfo.data || {};
    if (!firstName && !lastName) return "Not provided";
    if (!firstName) return lastName;
    if (!lastName) return firstName;
    return `${firstName} ${lastName}`;
  };

  // Event handlers
  const handleEditProfileClick = () => {
    setEditProfileData({
      phoneNumber: studentInfo.data?.phoneNumber || "",
      nic: studentInfo.data?.nic || "",
      birthday: studentInfo.data?.birthday || "",
      gender: studentInfo.data?.gender || "Male",
    });
    setShowEditProfileModal(true);
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;

    // Validation for different input fields
    if (name === "phoneNumber") {
      // Only allow numbers for phone number
      if (!/^[0-9]*$/.test(value) || value.length > 10) {
        return;
      }
    }

    if (name === "nic") {
      // Only allow numbers for NIC
      if (!/^[0-9]*$/.test(value) || value.length > 12) {
        return;
      }
    }

    // Validate birthday to prevent future dates
    if (name === "birthday") {
      const selectedDate = new Date(value);
      const currentDate = new Date();

      // Reset time portion to compare just the dates
      selectedDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);

      if (selectedDate > currentDate) {
        return;
      }
    }

    setEditProfileData({
      ...editProfileData,
      [name]: value,
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileFormError(null);

    // Basic field validation
    if (
      !editProfileData.phoneNumber ||
      !editProfileData.nic ||
      !editProfileData.birthday ||
      !editProfileData.gender
    ) {
      setProfileFormError("All fields are required");
      setProfileSubmitting(false);
      return;
    }

    // Phone number validation
    if (!/^[0-9]{10}$/.test(editProfileData.phoneNumber)) {
      setProfileFormError("Phone Number must be exactly 10 digits");
      setProfileSubmitting(false);
      return;
    }

    // NIC validation
    if (!/^[0-9]{1,12}$/.test(editProfileData.nic)) {
      setProfileFormError("NIC must contain up to 12 digits only");
      setProfileSubmitting(false);
      return;
    }

    // Birthday future date validation
    const selectedDate = new Date(editProfileData.birthday);
    const currentDate = new Date();
    if (selectedDate > currentDate) {
      setProfileFormError("Birthday cannot be a future date");
      setProfileSubmitting(false);
      return;
    }

    const isConnected = await checkServerConnection();
    if (!isConnected) {
      setTimeout(() => {
        // Update only the fields in the form
        const updatedInfo = {
          ...studentInfo.data,
          phoneNumber: editProfileData.phoneNumber,
          nic: editProfileData.nic,
          birthday: editProfileData.birthday,
          gender: editProfileData.gender,
        };
        studentInfo.setData(updatedInfo);
        setShowEditProfileModal(false);
        alert(
          "OFFLINE MODE: Profile updated locally. Will sync when server is available."
        );
        setProfileSubmitting(false);
      }, 1000);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const profileData = {
        phoneNumber: editProfileData.phoneNumber,
        nic: editProfileData.nic,
        birthday: editProfileData.birthday,
        gender: editProfileData.gender,
      };

      const response = await axios.put(
        `${API_BASE_URL}/students/profile`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      studentInfo.setData(response.data.student);
      setShowEditProfileModal(false);
      alert("Profile updated successfully");
    } catch (err) {
      console.error("Error updating student profile:", err);
      setProfileFormError(
        err.response?.data?.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleDeleteProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/students/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Clear profile data
      studentInfo.setData({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        nic: "",
        birthday: "",
        gender: "",
      });

      setShowDeleteConfirm(false);
      setShowEditProfileModal(false);
      alert("Profile data has been deleted successfully");
    } catch (err) {
      console.error("Error deleting profile:", err);
      alert("Failed to delete profile. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleShowProfileSection = () => {
    setShowProfileDropdown(false);
    setShowProfile(true);
  };

  // Render components
  const renderServerStatusMessage = () => {
    if (serverStatus.checking || serverStatus.connected) return null;

    return (
      <div className="server-status disconnected">
        <FaServer /> Server Offline - Working in Local Mode
      </div>
    );
  };

  const renderEnrolledCourses = () => {
    if (enrolledCourses.length === 0) {
      return (
        <p className="no-data-message">
          You haven't enrolled in any courses yet.
        </p>
      );
    }

    return (
      <div className="courses-grid">
        {enrolledCourses.map((course, index) => (
          <div key={index} className="course-card">
            <div className="course-card-header">
              <FaBook className="course-icon" />
              <a
                href={`/dashboard/course/enrolled/${course.courseId}`}
                rel="noopener noreferrer"
                className="course-link"
              >
                <h4>{course.courseName}</h4>
              </a>
            </div>
            <div className="course-card-content">
              <div className="course-info">
                <div className="info-item">
                  <FaCalendarAlt className="info-icon" />
                  <span>
                    Enrolled: {new Date(course.enrolledAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="info-item">
                  <FaShoppingCart className="info-icon" />
                  <span>Price: {course.price}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAvailableCourses = () => {
    if (courses.loading) {
      return (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Loading courses...</p>
        </div>
      );
    }

    if (courses.error) {
      return (
        <div className="error-message">
          <p>{courses.error}</p>
          <button
            className="btn-primary"
            onClick={() =>
              courses.execute(
                () =>
                  axios.get(`${API_BASE_URL}/courses`, {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                  }),
                [],
                "Failed to load courses"
              )
            }
          >
            Retry
          </button>
        </div>
      );
    }

    if (!courses.data || courses.data.length === 0) {
      return <p className="no-data-message">No courses found.</p>;
    }

    const availableCourses = courses.data.filter(
      (course) =>
        !enrolledCourses.some((ec) => ec.courseId === (course.id || course._id))
    );

    if (availableCourses.length === 0) {
      return (
        <p className="no-data-message">
          You've enrolled in all available courses.
        </p>
      );
    }

    return (
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Course Name</th>
            <th>Lecturer</th>
            <th>Duration</th>
            <th>Start Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {availableCourses.map((course) => (
            <tr key={course.id || course._id}>
              <td>
                {course.image ? (
                  <img
                    src={`${API_BASE_URL}${course.image}`}
                    alt={course.name}
                    style={{
                      width: "50px",
                      height: "50px",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://via.placeholder.com/50x50?text=No+Image";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      backgroundColor: "#f0f0f0",
                    }}
                  />
                )}
              </td>
              <td>
                <a
                  href={`/dashboard/course/${course.id || course._id}`}
                  rel="noopener noreferrer"
                  className="course-link"
                >
                  {course.name}
                </a>
              </td>
              <td>{course.lecturer}</td>
              <td>{course.duration}</td>
              <td>{course.startDate}</td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn-small"
                    onClick={() =>
                      navigate(
                        `/dashboard/course-payment/${course.id || course._id}`,
                        {
                          state: {
                            courseData: course,
                            returnTo: "/student-dashboard",
                          },
                        }
                      )
                    }
                  >
                    <FaShoppingCart className="icon-left" /> Purchase & Enroll
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderExams = () => {
    if (exams.loading) {
      return (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Loading exams...</p>
        </div>
      );
    }

    if (exams.error) {
      return (
        <div className="error-message">
          <p>{exams.error}</p>
          <button className="btn-primary" onClick={fetchExams}>
            Retry
          </button>
        </div>
      );
    }

    if (!exams.data || exams.data.length === 0) {
      return (
        <p className="no-data-message">
          No exams found for your enrolled courses.
        </p>
      );
    }

    return (
      <table>
        <thead>
          <tr>
            <th>Exam</th>
            <th>Course</th>
            <th>Date</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {exams.data.map((exam) => (
            <tr key={exam.id || exam._id}>
              <td>{exam.title}</td>
              <td>
                <span className="enrolled-course-marker">{exam.course}</span>
              </td>
              <td>{exam.examDate}</td>
              <td>{exam.startTime}</td>
              <td>{exam.endTime}</td>
              <td>{exam.location || "Online"}</td>
              <td>
                <div className="action-buttons">
                  {exam.examUrl && (
                    <a
                      href={exam.examUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-small"
                    >
                      <FaExternalLinkAlt className="icon-left" /> View
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderExamsAndQuizzes = () => {
    if (exams.loading || quizzes.loading) {
      return (
        <div className="loading-spinner">Loading exams and quizzes...</div>
      );
    }

    if (exams.error || quizzes.error) {
      return (
        <div className="error-message">{exams.error || quizzes.error}</div>
      );
    }

    if (!exams.data || exams.data.length === 0) {
      return (
        <div className="empty-state">
          <p>No exams are currently available for your courses.</p>
        </div>
      );
    }

    return (
      <div className="exams-list">
        {exams.data.map((exam) => {
          // Get quizzes for this exam
          const examQuizzes =
            quizzes.data?.filter(
              (quiz) =>
                (quiz.examId === exam._id || quiz.examId === exam.id) &&
                quiz.isActive
            ) || [];

          return (
            <div key={exam._id || exam.id} className="exam-card">
              <div className="exam-header">
                <h4>{exam.title}</h4>
                <span className="exam-course">{exam.course}</span>
                <div className="exam-info">
                  <span className="exam-date">
                    <FaCalendarAlt className="icon-left" /> {exam.examDate}
                  </span>
                  <span className="exam-time">
                    <FaClock className="icon-left" /> {exam.startTime} -{" "}
                    {exam.endTime}
                  </span>
                </div>
              </div>

              {examQuizzes.length > 0 ? (
                <div className="quiz-list">
                  <h5>Available Quizzes</h5>
                  {examQuizzes.map((quiz) => {
                    const attempt = getQuizAttempt(quiz._id || quiz.id);
                    const hasCompleted =
                      attempt && attempt.status === "completed";

                    return (
                      <div key={quiz._id || quiz.id} className="quiz-item">
                        <div className="quiz-info">
                          <span className="quiz-title">{quiz.title}</span>
                          <span className="quiz-duration">
                            <FaClock className="icon-left" /> {quiz.timeLimit}{" "}
                            minutes
                          </span>
                        </div>

                        <div className="quiz-status">
                          {hasCompleted ? (
                            <>
                              <span className="quiz-score">
                                Score: {attempt.score}/{attempt.maxScore} (
                                {Math.round(
                                  (attempt.score / attempt.maxScore) * 100
                                )}
                                %)
                              </span>
                              <Link
                                to={`/dashboard/quiz/${
                                  quiz._id || quiz.id
                                }/results`}
                                className="btn-small view-results"
                              >
                                View Results
                              </Link>
                            </>
                          ) : (
                            <Link
                              to={`/dashboard/quiz/${quiz._id || quiz.id}/take`}
                              className="btn-small start-quiz"
                            >
                              {attempt && attempt.status === "in-progress"
                                ? "Continue Quiz"
                                : "Start Quiz"}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-quizzes-message">
                  <p>No quizzes available for this exam yet.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Student Dashboard</h1>
        <div className="dashboard-header-right">
          <div className="header-icons">
            <div className="icon-wrapper">
              <FaBell className="header-icon" />
              {notifications > 0 && (
                <span className="badge">{notifications}</span>
              )}
            </div>
            <div className="icon-wrapper">
              <FaEnvelope className="header-icon" />
              {messages > 0 && <span className="badge">{messages}</span>}
            </div>
          </div>
          <div className="profile-dropdown-container">
            <div
              className="user-icon-wrapper"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <FaUser className="user-icon" />
              <span className="user-name-display">{getFullName()}</span>
            </div>
            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <FaUser className="dropdown-icon" />
                  <div className="user-info">
                    <span className="user-name">{getFullName()}</span>
                    <span className="user-role">Student</span>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <div
                  className="dropdown-item"
                  onClick={handleShowProfileSection}
                >
                  <FaUser className="dropdown-icon" />
                  <span>My Profile</span>
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setShowEditProfileModal(true);
                    setShowProfileDropdown(false);
                  }}
                >
                  <FaCog className="dropdown-icon" />
                  <span>Edit Profile</span>
                </div>
                <div className="dropdown-item" onClick={handleLogout}>
                  <FaSignOutAlt className="dropdown-icon" />
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="back-link">
        <Link to="/" className="btn-back">
          <FaHome className="icon-left" /> Home Page
        </Link>
      </div>

      {showProfile ? (
        <StudentProfile
          studentInfo={studentInfo.data}
          onEditClick={() => {
            setShowEditProfileModal(true);
            setShowProfile(false);
          }}
          onBack={() => setShowProfile(false)}
        />
      ) : (
        <>
          {renderServerStatusMessage()}

          <div className="dashboard-card">
            <h3>My Courses</h3>
            {enrolledCourses.length === 0 ? (
              <p className="no-data-message">
                You haven't enrolled in any courses yet.
              </p>
            ) : (
              renderEnrolledCourses()
            )}
          </div>

          <div className="dashboard-card">
            <h3>Available Courses</h3>
            {renderAvailableCourses()}
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="dashboard-card">
              <h3>My Exams</h3>
              {renderExams()}
            </div>
          ) : null}

          {/* New Exams and Quizzes Section - Always show this section */}
          <div className="dashboard-card exams-quizzes-section">
            <div className="card-header-with-actions">
              <h3>My Exams & Quizzes</h3>
              <Link to="/dashboard/exam-timetable" className="view-all-link">
                View All Exams
              </Link>
            </div>
            {renderExamsAndQuizzes()}
          </div>
        </>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button
                className="close-button"
                onClick={() => setShowEditProfileModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label>
                  <FaUser className="input-icon" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={`${studentInfo.data?.firstName || ""} ${
                    studentInfo.data?.lastName || ""
                  }`}
                  disabled
                  className="input-readonly"
                />
                <small className="field-note">
                  Name cannot be edited. Please contact support for name
                  changes.
                </small>
              </div>

              <div className="form-group">
                <label>
                  <FaPhone className="input-icon" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={editProfileData.phoneNumber}
                  onChange={handleProfileInputChange}
                  placeholder="Enter phone number"
                  className="input-editable"
                />
              </div>

              <div className="form-group">
                <label>
                  <FaIdCard className="input-icon" />
                  NIC
                </label>
                <input
                  type="text"
                  name="nic"
                  value={editProfileData.nic}
                  onChange={handleProfileInputChange}
                  placeholder="Enter NIC"
                  className="input-editable"
                />
              </div>

              <div className="form-group">
                <label>
                  <FaBirthdayCake className="input-icon" />
                  Birthday
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={editProfileData.birthday}
                  onChange={handleProfileInputChange}
                  max={getCurrentDate()}
                  className="input-editable"
                />
              </div>

              <div className="form-group">
                <label>
                  <FaVenusMars className="input-icon" />
                  Gender
                </label>
                <select
                  name="gender"
                  value={editProfileData.gender}
                  onChange={handleProfileInputChange}
                  className="input-editable"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {profileFormError && (
                <div className="error-message">{profileFormError}</div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Profile Data
                </button>
                <div className="right-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowEditProfileModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={profileSubmitting}
                  >
                    {profileSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm">
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button
                className="close-button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="confirm-message">
              <p>
                Are you sure you want to delete your profile data? This action
                cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDeleteProfile}>
                Yes, Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
