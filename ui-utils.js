import { getState, setState } from "./utils";
const CLASS_BS = "bb-enhancements";

function injectMeta(name, content) {
  const metaTag = document.createElement("meta");
  metaTag.name = name;
  metaTag.content = content;

  // Insert the meta tag into the head of the document
  document.head.appendChild(metaTag);
}

function getCssClass(className) {
  return className
    .split(" ")
    .filter(Boolean)
    .map(name => CLASS_BS + "-" + name)
    .join(" ");
}
function addCssClass(element, className) {
  element.classList.add(...getCssClass(className).split(" ").filter(Boolean));
}

function alert(message, options = {}) {
  const selfDestroy = self => {
    if (self && self.parentNode) {
      self.parentNode.removeChild(self);
    }
  };

  const alertDiv = document.createElement("div");
  alertDiv.className = "centered-alert";
  alertDiv.innerHTML = message;

  // Set CSS variables based on function parameters
  if (options.background) {
    alertDiv.style.setProperty("--alert-background", options.background);
  }
  if (options.color) {
    alertDiv.style.setProperty("--alert-color", options.color);
  }

  const alertCloseBtn = document.createElement("span");
  alertCloseBtn.innerHTML = "&times;";
  alertCloseBtn.className = "btn-close";
  alertCloseBtn.onclick = e => selfDestroy(alertDiv);

  alertDiv.appendChild(alertCloseBtn);

  document.body.appendChild(alertDiv);

  // Show the alert
  alertDiv.style.display = "block";

  setTimeout(() => {
    selfDestroy(alertDiv);
  }, options.timeout || 10000);
}

function addColumn(parent, elementType, callback) {
  const newChild = document.createElement(elementType);

  var inputElement = document.createElement("input");
  inputElement.type = "checkbox";

  if ("function" === typeof callback) {
    const attributes = callback(inputElement) || {};

    Object.keys(attributes).forEach(key => {
      // an event attribute
      if ("function" === typeof attributes[key]) {
        inputElement.addEventListener(key, attributes[key]);
      } else {
        inputElement.setAttribute(key, attributes[key]);
      }
    });

    newChild.appendChild(inputElement);

    parent.insertBefore(newChild, parent.firstChild);
  }
}

function addNewToolbar(parent) {
  const div = document.createElement("div");
  addCssClass(div, "toolbar");
  parent.appendChild(div);

  return div;
}

function addToolButton(parent, caption, listener, className, style = {}) {
  const { selectedIssues, changeListeners } = getState();
  const button = document.createElement("button");
  addCssClass(
    button,
    "button " + (className || caption.toLowerCase().replace(/[\s\S]/g, "-"))
  );

  // custom style
  Object.keys(style).forEach(key => {
    button.style[key] = style[key];
  });

  button.textContent = caption;
  button.disabled = !selectedIssues.length;

  button.addEventListener("click", listener);

  parent.appendChild(button);

  const newState = {
    changeListeners: [
      ...changeListeners,
      element => {
        const { selectedIssues } = getState();

        button.disabled = !selectedIssues.length;
      }
    ]
  };

  setState(newState);

  return button;
}

function addToolFilter(
  parent,
  title,
  listeners = {},
  className = "",
  style = {}
) {
  const wrapper = document.createElement("div");
  const _className = ["input-filter-wrapper", className]
    .filter(Boolean)
    .join(" ");

  addCssClass(wrapper, _className);

  // custom style
  Object.keys(style).forEach(key => {
    wrapper.style[key] = style[key];
  });

  const btnFindAll = document.createElement("button");
  btnFindAll.textContent = "Find All";
  btnFindAll.disabled = true;

  const input = document.createElement("input");

  input.type = "search";
  input.placeholder = title;
  input.title = title;
  input.addEventListener("keyup", e => {
    if ("function" === typeof listeners.keyup) {
      listeners.keyup(e);
    }
    btnFindAll.disabled = !e.target.value;
  });

  // handle the search input clear event
  input.addEventListener("input", e => {
    if ("" === e.target.value) {
      const ev = new Event("keyup");
      input.dispatchEvent(ev);
    }
  });

  btnFindAll.addEventListener("click", e => {
    if ("function" === typeof listeners.findAll) {
      const selector =
        "." + getCssClass(_className) + ' > input[type="search"]';
      const input = document.querySelector(selector);
      if (input) {
        listeners.findAll(e, input.value);
      }
    }
  });

  parent.appendChild(wrapper);
  wrapper.appendChild(input);
  wrapper.appendChild(btnFindAll);

  return input;
}
function getProgress() {
  const progressInner = document.querySelector(
    "div." + getCssClass("progress-inner")
  );
  const progressOuter = document.querySelector(
    "div." + getCssClass("progress-outer")
  );

  return { progressInner, progressOuter };
}

function setProgress(progress) {
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

  if (Number.isNaN(percentage)) {
    return;
  }

  const p = Math.round(percentage);

  let { progressInner, progressOuter } = getProgress();

  if (progressInner) {
    Object.keys(progress).forEach(key => {
      const value = ["elapsed", "estimatedTime", "eta"].includes(key)
        ? progress[key] / 1000
        : progress[key];
      progressInner.setAttribute("data-" + key, Math.round(value));
    });

    progressInner.textContent = p + "%";
  }
  if (progressOuter) {
    progressOuter.style.setProperty("--progress", p + "%");
  }
}

function showProgress(visible = true) {
  const _className = getCssClass("loader-container");

  if (visible) {
    const backdrop = document.createElement("div");
    backdrop.className = _className;
    const progressInner = document.createElement("div");
    progressInner.className = getCssClass("progress-inner");
    const progressOuter = document.createElement("div");
    progressOuter.className = getCssClass("progress-outer");

    backdrop.appendChild(progressInner);
    backdrop.appendChild(progressOuter);
    document.body.appendChild(backdrop);

    return { progressInner, progressOuter };
  } else {
    const backdrop = document.querySelector("." + _className);
    if (backdrop) {
      backdrop.parentNode.removeChild(backdrop);
    }
  }
}

function renderTable(parent, items = []) {
  if (!items.length) {
    return null;
  }

  const table = document.createElement("div");
  addCssClass(table, "table");
  const thead = document.createElement("div");
  addCssClass(thead, "thead");

  Object.keys(items[0]).forEach(key => {
    const th = document.createElement("div");
    addCssClass(th, "th");
    if (items[0][key].style) {
      Object.keys(items[0][key].style).forEach(name => {
        th.style[name] = items[0][key].style[name];
      });
    }

    if (items[0][key].input) {
      const input = document.createElement("input");
      addCssClass(input, "input-" + items[0][key].input);
      input.type = items[0][key].input;
      input.addEventListener("change", items[0][key].change);
      th.appendChild(input);
    } else {
      th.textContent = key;
    }

    thead.appendChild(th);
  });

  const tbody = document.createElement("div");
  addCssClass(tbody, "tbody");

  table.appendChild(thead);
  table.appendChild(tbody);

  items.forEach(item => {
    const row = document.createElement("div");
    addCssClass(row, "row");

    Object.keys(item).forEach(key => {
      const td = document.createElement("div");
      addCssClass(td, "td");
      if (item[key].input) {
        const input = document.createElement("input");
        addCssClass(input, "input-" + item[key].input);
        input.type = item[key].input;
        input.setAttribute("data-id", item[key].value);
        input.setAttribute("data-url", item[key].href);
        input.addEventListener("change", item[key].change);
        td.appendChild(input);
      } else if (item[key].href) {
        td.innerHTML = `<a href="${item[key].href}">${item[key].value}</a>`;
      } else {
        td.textContent = item[key].value;
      }
      if (item[key].style) {
        Object.keys(item[key].style).forEach(name => {
          td.style[name] = item[key].style[name];
        });
      }
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  if (parent) {
    parent.appendChild(table);
  }

  return table;
}

function renderModal(title, buttons = [], children = [], overlay = true) {
  let _overlay;
  const modal = document.createElement("div");

  const handleKeyboardEvent = e => {
    if ("Escape" === e.key) {
      close(e);
    }
  };

  const close = e => {
    if (_overlay) {
      _overlay.parentNode.removeChild(_overlay);
    }
    modal.parentNode?.removeChild(modal);

    document.removeEventListener("keydown", handleKeyboardEvent);
  };

  if (overlay) {
    _overlay = document.createElement("div");
    addCssClass(_overlay, "modal-overlay");
  }

  addCssClass(modal, "modal");

  const header = document.createElement("div");
  addCssClass(header, "modal-header");
  const modalTitle = document.createElement("span");
  addCssClass(modalTitle, "modal-title");
  modalTitle.textContent = title;
  header.appendChild(modalTitle);

  const headerCloseBtn = document.createElement("span");
  addCssClass(headerCloseBtn, "modal-title-close");
  headerCloseBtn.innerHTML = "&times;";
  headerCloseBtn.addEventListener("click", close);
  header.appendChild(headerCloseBtn);
  modal.appendChild(header);

  const body = document.createElement("div");
  addCssClass(body, "modal-body");
  if (Array.isArray(children)) {
    children.forEach(child => body.appendChild(child));
  } else if (children) {
    if ("function" === typeof children) {
      const child = children();
      if (child) {
        body.appendChild(child);
      }
    } else {
      body.appendChild(children);
    }
  }
  modal.appendChild(body);

  const footer = document.createElement("div");
  addCssClass(footer, "modal-footer");
  buttons.forEach(({ title, style, className, onclick, disabled }) => {
    const button = document.createElement("button");
    addCssClass(button, "modal-button");
    button.textContent = title;
    if (className) {
      button.classList.add(...className.split(" ").filter(Boolean));
    }
    if (style) {
      Object.keys(style).forEach(name => {
        button.style[name] = style[name];
      });
    }
    button.onclick = onclick;
    button.disabled = disabled;
    footer.appendChild(button);
  });
  modal.appendChild(footer);

  document.body.appendChild(_overlay);
  document.body.appendChild(modal);

  document.addEventListener("keydown", handleKeyboardEvent);

  return { modal, header, body, footer, overlay: _overlay, close };
}

export {
  addColumn,
  addCssClass,
  addNewToolbar,
  addToolButton,
  addToolFilter,
  alert,
  getCssClass,
  getProgress,
  injectMeta,
  renderModal,
  renderTable,
  setProgress,
  showProgress
};
