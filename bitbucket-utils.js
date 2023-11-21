import { alert } from "./ui-utils";
import { getIssueElement, getState, setState } from "./utils";

function bitbucketAuthCredentials() {
  return new Promise((resolve, reject) => {
    try {
      // Only apply highlighting if the option is enabled
      chrome.storage.sync.get("auth_credentials", obj => {
        if (obj.auth_credentials || "object" === typeof obj.auth_credentials) {
          resolve(obj.auth_credentials);
        } else {
          resolve({ bb_username: "", bb_app_password: "" });
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

function sendRequest(path, method = "GET", url = "") {
  return bitbucketAuthCredentials().then(({ bb_username, bb_app_password }) => {
    const { pathname } = new URL(window.location);

    const [workspace, repoSlug] = pathname.split("/").filter(Boolean);

    const headers = new Headers({
      // see https://developer.atlassian.com/cloud/bitbucket/rest/intro/#basic-auth
      Authorization: `Basic ${btoa(`${bb_username}:${bb_app_password}`)}`,
      "Content-Type": "application/json"
    });

    const requestOptions = {
      headers: headers,
      method
    };

    const apiUrl =
      url ||
      [
        `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}`,
        path
      ]
        .filter(Boolean)
        .join("/");

    return fetch(apiUrl, requestOptions).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return response;
    });
  });
}

function markIssueAsSPAM(issueId) {
  alert(
    "Function not implemented. Bitbucket REST API for SPAM not yet available",
    { background: "orangered", color: "white" }
  );
}

/**
 * @description Delete the given issue(s)
 * @param {number|Array} issueId The issue id or a list of issue ids
 * @returns {Promise} Returns a promise that resolves deleting the given issues
 * @see https://developer.atlassian.com/cloud/bitbucket/rest/api-group-issue-tracker/#api-repositories-workspace-repo-slug-issues-issue-id-delete
 */
function deleteIssue(issueId) {
  const issueIds = Array.isArray(issueId) ? issueId : [issueId];

  const promises = issueIds.map(_issueId =>
    sendRequest(`issues/${_issueId}`, "DELETE")
      .then(response => ({ issueId: _issueId }))
      .catch(error => {
        console.error("Error deleting issue:", error);

        return Promise.resolve({ issueId: _issueId, error });
      })
  );

  return Promise.all(promises)
    .then(results => {
      const success = results.filter(({ issueId, error }) => !error);
      const errors = results.filter(({ issueId, error }) => error);

      // clean-up successfully deleted issues
      success.forEach(({ issueId }) => {
        const element = getIssueElement(issueId);
        if (!element) {
          return;
        }
        const isSelected = element.checked;

        const { selectedIssues, visibleIssues, changeListeners } = getState();

        const index = selectedIssues.indexOf(issueId);
        if (-1 !== index) {
          const newState = {
            selectedIssues: selectedIssues
              .slice(0, index)
              .concat(...selectedIssues.slice(index + 1))
          };

          if (isSelected) {
            newState.visibleIssues = visibleIssues - 1;
          }

          setState(newState);

          // inform the listeners about the change
          changeListeners.forEach(listener => listener(element));
        }

        const tr = element.closest("tr");
        tr.parentElement.removeChild(tr);
      });

      // alert successfully deleted issue
      if (success.length) {
        alert(
          `The following ${
            success.length
          } issue(s) have been deleted successfully: ${success
            .map(({ issueId }) => issueId)
            .join(", ")}`,
          {
            background: "lightgreen",
            color: "black"
          }
        );
      }

      // alert failed removals
      if (errors.length) {
        alert(
          `The following ${
            errors.length
          } issue(s) have failed to delete: <ol><li>${errors
            .map(({ issueId, error }) => `${issueId}: ${error.message}`)
            .join("</li><li>")}</li></ol>`,
          {
            background: "orangered",
            color: "white"
          }
        );
      }

      return { success, errors };
    })
    .catch(error => {
      console.error(error);
      alert(
        `There was an issue deleting issue ${issueIds.join(", ")}: ${
          error.message
        }`,
        {
          background: "orangered",
          color: "white"
        }
      );
    });
}

/**
 * @description Fetches all new issues matching the given searchText (all if empty)
 * @param {String} searchText The search text that must match be included by the issue title
 * @param {Function} onProgress A callback to notify the fetch progress
 * @param {String} nextPage The next issue page Url
 * @param {Array} [results=[]] Used internally for reccurence
 * @returns {Promise} Returns a promise that resolves the list of matches issues
 * @see https://developer.atlassian.com/cloud/bitbucket/rest/api-group-issue-tracker/#api-repositories-workspace-repo-slug-issues-get
 */
function listIssues(searchText, onProgress, nextPage, results = []) {
  const ALLOWED_STATUS = Array.from(
    new URLSearchParams(window.location.search).entries()
  )
    .filter(item => "status" === item[0])
    .map(item => item[1]);

  const _searchText = searchText.toLowerCase();

  if (!nextPage) {
    listIssues.started = +new Date();
    listIssues.fetched = 0;
  }

  // https://developer.atlassian.com/cloud/bitbucket/rest/intro/#filtering
  const query = encodeURIComponent(
    ALLOWED_STATUS.map(state => `state="${state}"`).join(" OR ")
  );

  return sendRequest(nextPage ? "" : "issues/?q=" + query, "GET", nextPage)
    .then(response => response.json())
    .then(response => {
      const { next, values, page, size } = response;

      listIssues.fetched += values.length;

      if ("function" === typeof onProgress) {
        const fetched = listIssues.fetched;

        if (fetched && size) {
          const elapsed = +new Date() - listIssues.started;
          const estimatedTime = (size * elapsed) / fetched;
          const eta = estimatedTime - elapsed;
          const percentage = (100 * fetched) / size;

          onProgress({
            fetched,
            page,
            pageCount: values.length ? Math.ceil(size / values.length) : 0,
            pageSize: values.length,
            size,
            elapsed,
            estimatedTime,
            eta,
            percentage
          });
        }
      }

      const pageResult = values
        .filter(
          value =>
            ALLOWED_STATUS.includes(value.state) &&
            (!_searchText ||
              -1 !== value.title.toLowerCase().indexOf(_searchText))
        )
        .map(value => ({
          id: value.id,
          title: value.title,
          url: value.links.html.href,
          created_on: new Date(value.created_on),
          kind: value.kind
        }));

      if (next) {
        return listIssues(
          searchText,
          onProgress,
          next,
          results.concat(...pageResult)
        );
      }

      return Promise.resolve(results.concat(...pageResult));
    });
}

export { deleteIssue, listIssues, markIssueAsSPAM };
