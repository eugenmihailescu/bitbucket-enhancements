import { deleteIssue, listIssues, markIssueAsSPAM } from "./bitbucket-utils";
import "./styles.css";
import {
  addColumn,
  addNewToolbar,
  addToolButton,
  addToolFilter,
  alert,
  getCssClass,
  injectMeta,
  renderModal,
  renderTable,
  setProgress,
  showProgress
} from "./ui-utils";
import {
  ALL_ISSUES_TOGGLE,
  formatDateTime,
  getState,
  setSelectedIssues,
  setState
} from "./utils";

// Your content script logic goes here
console.log("Bitbucket enhancements extension loaded!");

function enhanceUI() {
  const toolbar = document.querySelector("header > div#issues-toolbar");
  const table = document.querySelector("table.issues-list");

  if (!table) {
    return setTimeout(() => enhanceUI(), 100);
  }

  const header = table.querySelector("thead>tr");
  const rows = table.querySelectorAll("tbody>tr");

  const myToolbar = addNewToolbar(toolbar.parentNode);
  const btnDelete = addToolButton(
    myToolbar,
    "Delete",
    e => {
      deleteIssue(getState("selectedIssues"));
    },
    "delete"
  );
  const btnSpam = addToolButton(
    myToolbar,
    "SPAM",
    e => {
      markIssueAsSPAM(getState("selectedIssues"));
    },
    "spam"
  );

  addToolFilter(myToolbar, "Filter issues...", {
    keyup: e => {
      const value = e.target.value.trim().toLowerCase();

      Array.from(rows).forEach(row => {
        const a = row.querySelector("a.execute");
        if (a) {
          if (value && -1 === a.textContent.toLowerCase().indexOf(value)) {
            row.classList.add("hidden-row");
          } else {
            row.classList.remove("hidden-row");
          }
        }
      });
    },
    findAll: (e, searchText) => {
      showProgress(true);

      const onProgress = progress => {
        const {
          fetched,
          page,
          pageCount,
          pageSize,
          size,
          elapsed,
          estimatedTime,
          eta,
          percentage
        } = progress;

        console.log(
          `fetched page ${page} (${fetched} issues, ~${percentage.toFixed(
            2
          )}% in ${Math.round(elapsed / 1000)}s (ETA: ${Math.round(
            eta / 1000
          )}s)`
        );

        setProgress(progress);
      };

      listIssues(searchText, onProgress)
        .then(res => {
          const getSelector = section =>
            "." +
            getCssClass(section) +
            " input." +
            getCssClass("input-checkbox") +
            '[type="checkbox"]';

          const disableButtons = disabled => {
            const selector = ["button.btn-delete", "button.btn-spam"]
              .map(name => "." + getCssClass("modal-footer") + " " + name)
              .join(",");

            const buttons = document.querySelectorAll(selector);

            Array.from(buttons).forEach(button => {
              button.disabled = disabled;
            });
          };

          const getSelectedInputs = () => {
            const selector = getSelector("tbody");
            const inputs = document.querySelectorAll(selector);
            const issueIds = Array.from(inputs)
              .filter(input => input.checked)
              .map(input => input.getAttribute("data-id"));

            return issueIds;
          };

          const rows = res.map(item => ({
            rowId: {
              value: item.id,
              href: item.url,
              input: "checkbox",
              change: e => {
                const selector = getSelector("tbody");

                const inputs = document.querySelectorAll(selector);

                const isCheckAll = !e.target.getAttribute("data-id");
                // the thead checkbox
                if (isCheckAll) {
                  Array.from(inputs).forEach(input => {
                    input.checked = e.target.checked;
                  });
                }
                // the body checkboxes
                else {
                  const selector = getSelector("thead");

                  const thCheckInput = document.querySelector(selector);

                  const checkedCount = Array.from(inputs).reduce(
                    (carry, input) => carry + +input.checked,
                    0
                  );

                  thCheckInput.checked = checkedCount === inputs.length;
                  thCheckInput.indeterminate =
                    checkedCount && !thCheckInput.checked;

                  disableButtons(!checkedCount);
                }
              },
              style: { width: "2rem" }
            },
            id: { value: item.id, href: item.url, style: { width: "5rem" } },
            title: { value: item.title, style: { width: "100%" } },
            kind: { value: item.kind, style: { width: "7rem" } },
            created: {
              value: formatDateTime(item.created_on),
              style: { width: "13rem" }
            }
          }));

          const { close } = renderModal(
            `${rows.length || "No"} matched items`,
            [
              {
                title: "Cancel",
                className: "btn-cancel",
                onclick: e => {
                  close(e);
                },
                disabled: false
              },
              {
                title: "Delete",
                className: "btn-delete",
                onclick: e => deleteIssue(getSelectedInputs()),
                disabled: true
              },
              {
                title: "SPAM",
                className: "btn-spam",
                onclick: e => markIssueAsSPAM(getSelectedInputs()),
                disabled: true
              }
            ].filter(button => rows.length || !button.disabled),
            () => {
              const table = renderTable(null, rows);
              if (table) {
                return table;
              }

              const message = document.createElement("p");
              message.textContent = `There is no issue with status "new" that matches "${searchText}"`;

              return message;
            }
          );
        })
        .catch(error => {
          console.error(error);
          alert(`Error while fetching all issues: ${error.message}`, {
            background: "orangered",
            color: "white"
          });
        })
        .finally(() => showProgress(false));
    }
  });

  // adding the header toggle
  addColumn(header, "th", element => ({
    id: ALL_ISSUES_TOGGLE,
    change: e => {
      const checked = e.target.checked;
      const inputs = table.querySelectorAll(
        'tbody>tr:not(.hidden-row) input[type="checkbox"][data-issue-id]'
      );

      Array.from(inputs).forEach(el => {
        el.checked = checked;

        setSelectedIssues(el);
      });
    }
  }));

  // adding the rows toggle for each issue
  Array.from(rows).forEach(row =>
    addColumn(row, "td", element => {
      const a = row.querySelector("a.execute");
      if (a) {
        const href = a.getAttribute("href") || "";
        const issueId = href.replace(/.+\/issues\/(\d+)\/.*/, "$1");

        if (!issueId) {
          return;
        }

        setState({ visibleIssues: getState("visibleIssues") + 1 });

        return {
          id: `issue-${issueId}-toggle`,
          "data-issue-id": issueId,
          change: e => setSelectedIssues(e.target)
        };
      }
    })
  );
}

document.addEventListener("DOMContentLoaded", function () {
  injectMeta("viewport", "width=device-width,initial-scale=1,shrink-to-fit=no");
  enhanceUI();
});
