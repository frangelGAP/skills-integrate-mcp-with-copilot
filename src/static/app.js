document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherOnlyMessage = document.getElementById("teacher-only-message");
  const adminToggle = document.getElementById("admin-toggle");
  const adminPanel = document.getElementById("admin-panel");
  const loginStatus = document.getElementById("login-status");
  const openLoginButton = document.getElementById("open-login");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const closeLoginButton = document.getElementById("close-login");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");

  let adminToken = sessionStorage.getItem("adminToken") || "";
  let adminUsername = sessionStorage.getItem("adminUsername") || "";

  function showBanner(element, text, type) {
    element.textContent = text;
    element.className = type;
    element.classList.remove("hidden");
  }

  function hideBannerAfterDelay(element, delay = 5000) {
    setTimeout(() => {
      element.classList.add("hidden");
    }, delay);
  }

  function getAdminHeaders() {
    return adminToken ? { "X-Admin-Token": adminToken } : {};
  }

  function isAdmin() {
    return Boolean(adminToken && adminUsername);
  }

  function resetActivitySelect() {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
  }

  function updateAdminUI() {
    if (isAdmin()) {
      loginStatus.textContent = `Logged in as ${adminUsername}`;
      openLoginButton.classList.add("hidden");
      logoutButton.classList.remove("hidden");
      signupForm.classList.remove("hidden");
      teacherOnlyMessage.textContent = "Teachers can register and unregister students from this panel.";
      teacherOnlyMessage.className = "info-banner success";
    } else {
      loginStatus.textContent = "Viewing as student";
      openLoginButton.classList.remove("hidden");
      logoutButton.classList.add("hidden");
      signupForm.classList.add("hidden");
      teacherOnlyMessage.textContent = "Teachers must log in to register or unregister students.";
      teacherOnlyMessage.className = "info-banner";
    }
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  }

  function clearAdminSession() {
    adminToken = "";
    adminUsername = "";
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminUsername");
    updateAdminUI();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      resetActivitySelect();

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isAdmin()
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!isAdmin()) {
      showBanner(messageDiv, "Teacher login required", "error");
      hideBannerAfterDelay(messageDiv);
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAdminHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showBanner(messageDiv, result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          clearAdminSession();
        }
        showBanner(messageDiv, result.detail || "An error occurred", "error");
      }
      hideBannerAfterDelay(messageDiv);
    } catch (error) {
      showBanner(messageDiv, "Failed to unregister. Please try again.", "error");
      hideBannerAfterDelay(messageDiv);
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isAdmin()) {
      showBanner(messageDiv, "Teacher login required", "error");
      hideBannerAfterDelay(messageDiv);
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAdminHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showBanner(messageDiv, result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          clearAdminSession();
        }
        showBanner(messageDiv, result.detail || "An error occurred", "error");
      }
      hideBannerAfterDelay(messageDiv);
    } catch (error) {
      showBanner(messageDiv, "Failed to sign up. Please try again.", "error");
      hideBannerAfterDelay(messageDiv);
      console.error("Error signing up:", error);
    }
  });

  adminToggle.addEventListener("click", () => {
    adminPanel.classList.toggle("hidden");
  });

  openLoginButton.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    adminPanel.classList.add("hidden");
  });

  closeLoginButton.addEventListener("click", closeLoginModal);

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        showBanner(loginMessage, result.detail || "Login failed", "error");
        return;
      }

      adminToken = result.token;
      adminUsername = result.username;
      sessionStorage.setItem("adminToken", adminToken);
      sessionStorage.setItem("adminUsername", adminUsername);
      updateAdminUI();
      closeLoginModal();
      fetchActivities();
      showBanner(messageDiv, `Logged in as ${adminUsername}`, "success");
      hideBannerAfterDelay(messageDiv);
    } catch (error) {
      showBanner(loginMessage, "Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: getAdminHeaders(),
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    clearAdminSession();
    fetchActivities();
    showBanner(messageDiv, "Logged out", "success");
    hideBannerAfterDelay(messageDiv);
  });

  // Initialize app
  updateAdminUI();
  fetchActivities();
});
