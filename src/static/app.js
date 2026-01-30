document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to produce initials from an email local-part
  function initialsFromEmail(email) {
    const local = (email || "").split("@")[0] || "";
    const parts = local.split(/[\.\-_]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).slice(0,2).toUpperCase();
    }
    return local.slice(0,2).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select to avoid duplicate options when reloading
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Basic info
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";
        const title = document.createElement("h5");
        title.textContent = "Participants";
        participantsSection.appendChild(title);

        if (Array.isArray(details.participants) && details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";
          ul.setAttribute("aria-label", `${name} participants`);
          details.participants.forEach((p) => {
            const li = document.createElement("li");

            const avatar = document.createElement("span");
            avatar.className = "avatar";
            avatar.textContent = initialsFromEmail(p);
            avatar.setAttribute("aria-hidden", "true");

            const emailSpan = document.createElement("span");
            emailSpan.className = "participant-email";
            emailSpan.textContent = p;

            // Remove / unregister button
            const removeBtn = document.createElement("button");
            removeBtn.className = "remove-participant";
            removeBtn.setAttribute("aria-label", `Remove ${p} from ${name}`);
            removeBtn.textContent = "✖";
            removeBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );
                const result = await resp.json();

                if (resp.ok) {
                  messageDiv.textContent = result.message;
                  messageDiv.className = "success";
                } else {
                  messageDiv.textContent = result.detail || "An error occurred";
                  messageDiv.className = "error";
                }

                messageDiv.classList.remove("hidden");
                setTimeout(() => {
                  messageDiv.classList.add("hidden");
                }, 5000);

                // Refresh activities list
                fetchActivities();
              } catch (error) {
                messageDiv.textContent = "Failed to remove participant. Please try again.";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
                console.error("Error unregistering:", error);
              }
            });

            li.appendChild(avatar);
            li.appendChild(emailSpan);
            li.appendChild(removeBtn);
            ul.appendChild(li);
          });
          participantsSection.appendChild(ul);
        } else {
          const empty = document.createElement("p");
          empty.className = "no-participants";
          empty.textContent = "No participants yet";
          participantsSection.appendChild(empty);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
