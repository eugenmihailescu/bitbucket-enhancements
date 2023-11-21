const ALL_ISSUES_TOGGLE = "issues-list-all-toggle";

const state = { selectedIssues: [], visibleIssues: 0, changeListeners: [] };

function getIssueElement(issueId) {
  return document.querySelector(
    `input#issue-${issueId}-toggle[type="checkbox"][data-issue-id="${issueId}"]`
  );
}

function setSelectedIssues(element) {
  const issueId = element.getAttribute("data-issue-id");
  const selected = element.checked;

  const index = state.selectedIssues.indexOf(issueId);
  // add issue to selected list
  if (selected) {
    if (-1 === index) {
      state.selectedIssues.push(issueId);
    }
  } else {
    // remove issue from selected list
    if (-1 !== index) {
      state.selectedIssues = state.selectedIssues
        .slice(0, index)
        .concat(...state.selectedIssues.slice(index + 1));
    }
  }

  const headerIssueToggle = document.getElementById(ALL_ISSUES_TOGGLE);
  headerIssueToggle.checked =
    state.selectedIssues.length === state.visibleIssues;
  headerIssueToggle.indeterminate =
    state.selectedIssues.length && !headerIssueToggle.checked;

  state.changeListeners.forEach(listener => listener(element));
}

function getState(key) {
  if (key) {
    return state[key];
  }

  return { ...state };
}

function setState(changes) {
  Object.keys(changes).forEach(key => {
    state[key] = changes[key];
  });
}

function formatDateTime(date) {
  // Ensure that the input is a Date object
  if (!(date instanceof Date)) {
    return date;
  }

  // Get individual date components
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2); // Months are zero-based
  const day = ("0" + date.getDate()).slice(-2);
  const hours = ("0" + date.getHours()).slice(-2);
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);

  // Construct the formatted date string
  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  return formattedDate;
}

export {
  ALL_ISSUES_TOGGLE,
  formatDateTime,
  getIssueElement,
  getState,
  setSelectedIssues,
  setState
};
