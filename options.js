import "./options.css";

let auth_credentials = { bb_username: "", bb_app_password: "" };

function updateSaveState() {
  const btnSave = document.getElementById("save_options");

  btnSave.disabled = !(
    auth_credentials.bb_username || auth_credentials.bb_app_password
  );
}

/**
 * @description Load and page options
 */
function loadOptions() {
  chrome.storage.sync.get("auth_credentials", obj => {
    if (!obj.auth_credentials || "object" !== typeof obj.auth_credentials) {
      auth_credentials = { bb_username: "", bb_app_password: "" };
    } else {
      auth_credentials = obj.auth_credentials;
    }

    const bb_username = document.getElementById("bb_username");
    const bb_app_password = document.getElementById("bb_app_password");

    bb_username.value = auth_credentials.bb_username;
    bb_app_password.value = auth_credentials.bb_app_password;

    bb_username.addEventListener("change", e => {
      auth_credentials.bb_username = e.target.value;
      updateSaveState();
    });
    bb_app_password.addEventListener("change", e => {
      auth_credentials.bb_app_password = e.target.value;
      updateSaveState();
    });

    updateSaveState();
  });
}

/**
 * @description Save options to browser storage
 */
function saveOptions() {
  chrome.storage.sync.set({ auth_credentials });
}

/////////////////////////////////////////////////////////////////////////////////

// handle loading options page
document.addEventListener("DOMContentLoaded", () => {
  loadOptions();
});

// handle save rules
document
  .getElementById("save_options")
  .addEventListener("click", e => saveOptions());
