/* =========================================================
   Calculator Logic
   Vanilla JS · no framework · DOM-driven · accessible
   ========================================================= */

(function () {
  "use strict";

  /* ---------- DOM References ---------- */
  const displayPrevious = document.getElementById("display-previous");
  const displayCurrent = document.getElementById("display-current");
  const keypad = document.getElementById("keypad");
  const btnTheme = document.getElementById("btn-theme");
  const btnCopy = document.getElementById("btn-copy");
  const btnClearHistory = document.getElementById("btn-clear-history");
  const historyList = document.getElementById("history-list");
  const loader = document.getElementById("loader");

  /* ---------- State ---------- */
  let currentInput = "0";    // string shown in the main display
  let previousInput = "";    // first operand (string)
  let operator = null;       // active operator symbol: + - × ÷ %
  let justEvaluated = false; // true right after "=", enables result chaining

  /* ---------- Operator Map ---------- */
  const OPERATIONS = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "×": (a, b) => a * b,
    "÷": (a, b) => (b === 0 ? null : a / b), // null => divide-by-zero
    "%": (a, b) => (b === 0 ? null : (a / 100) * b), // a% of b
  };

  /* ---------- Number Formatting ---------- */
  // Trim float artifacts and add thousands separators.
  function formatNumber(value) {
    const num = parseFloat(value);
    if (Number.isNaN(num) || !isFinite(num)) return "Error";

    const rounded = Math.round((num + Number.EPSILON) * 1e10) / 1e10;
    const [intPart, decPart] = String(rounded).split(".");
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
  }

  // Strip formatting before parsing back to a number.
  const toNumber = (str) => parseFloat(str.replace(/,/g, ""));

  /* ---------- Rendering ---------- */
  function render() {
    displayCurrent.textContent = formatNumber(currentInput);
    displayPrevious.textContent =
      previousInput && operator ? `${formatNumber(previousInput)} ${operator}` : "";

    // Auto-shrink the display text when the value gets long.
    displayCurrent.classList.toggle("is-long", displayCurrent.textContent.length > 10);
  }

  /* ---------- Input Handling ---------- */
  function inputNumber(value) {
    // After "=", a fresh number starts (unless we are chaining an operator).
    if (justEvaluated) {
      if (operator) previousInput = currentInput; // chain from result
      else currentInput = "0";
      justEvaluated = false;
    }

    if (value === ".") {
      if (!currentInput.includes(".")) {
        currentInput = currentInput === "" || currentInput === "0" ? "0." : currentInput + ".";
      }
      return;
    }

    // Replace a lone leading zero, otherwise append.
    if (currentInput === "0") currentInput = value;
    else if (currentInput === "-0") currentInput = "-" + value;
    else currentInput += value;
  }

  function chooseOperator(sym) {
    // Consecutive calculation: evaluate the pending operation first.
    if (operator && previousInput !== "" && !justEvaluated) evaluate();

    if (justEvaluated) justEvaluated = false;
    else previousInput = currentInput;

    operator = sym;
    currentInput = "0";
  }

  function evaluate() {
    if (operator === null || previousInput === "") return;

    const a = toNumber(previousInput);
    const b = toNumber(currentInput);
    const fn = OPERATIONS[operator];
    if (typeof fn !== "function") return;

    const result = fn(a, b);

    // Divide-by-zero / invalid result => show Error, reset state.
    if (result === null || !isFinite(result)) {
      flashError();
      return;
    }

    const expr = `${formatNumber(String(a))} ${operator} ${formatNumber(String(b))}`;
    const resultStr = formatNumber(String(result));

    showLoading();
    addHistory(expr, resultStr);

    currentInput = resultStr;
    previousInput = "";
    operator = null;
    justEvaluated = true;
  }

  function toggleSign() {
    if (currentInput === "0") return;
    currentInput = currentInput.startsWith("-")
      ? currentInput.slice(1)
      : "-" + currentInput;
  }

  function deleteLast() {
    justEvaluated = false; // editing the result leaves evaluate-mode
    if (currentInput.length <= 1 || currentInput === "0") currentInput = "0";
    else currentInput = currentInput.slice(0, -1);
  }

  function clearEntry() {
    currentInput = "0";
    justEvaluated = false;
  }

  function allClear() {
    currentInput = "0";
    previousInput = "";
    operator = null;
    justEvaluated = false;
  }

  /* ---------- History & Feedback ---------- */
  function addHistory(expr, result) {
    const li = document.createElement("li");
    li.className = "history__item";
    li.innerHTML = `${expr} = <b>${result}</b>`;
    historyList.prepend(li);
  }

  function showLoading() {
    loader.classList.add("is-active");
    setTimeout(() => loader.classList.remove("is-active"), 350);
  }

  function flashError() {
    displayCurrent.textContent = "Error";
    displayPrevious.textContent = "";
    currentInput = "0";
    previousInput = "";
    operator = null;
    justEvaluated = true;
  }

  /* ---------- Ripple Effect ---------- */
  function attachRipple(el) {
    el.addEventListener("pointerdown", (e) => {
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }
  document.querySelectorAll(".btn, .icon-btn").forEach(attachRipple);

  /* ---------- Click Handling (delegated) ---------- */
  const ACTIONS = {
    equals: evaluate,
    clear: clearEntry,
    "all-clear": allClear,
    delete: deleteLast,
    sign: toggleSign,
  };

  keypad.addEventListener("click", (event) => {
    const btn = event.target.closest(".btn");
    if (!btn) return;

    if (btn.dataset.number !== undefined) inputNumber(btn.dataset.number);
    else if (btn.dataset.operator !== undefined) chooseOperator(btn.dataset.operator);
    else if (btn.dataset.action !== undefined) {
      const action = ACTIONS[btn.dataset.action];
      if (action) action();
    }
    render();
  });

  /* ---------- Keyboard Shortcuts ---------- */
  // Numbers, operators, Enter, Escape, Delete, Backspace.
  document.addEventListener("keydown", (event) => {
    const key = event.key;

    if (/^[0-9]$/.test(key)) inputNumber(key);
    else if (key === ".") inputNumber(".");
    else if (key === "+") chooseOperator("+");
    else if (key === "-") chooseOperator("-");
    else if (key === "*") chooseOperator("×");
    else if (key === "/") { event.preventDefault(); chooseOperator("÷"); }
    else if (key === "%") chooseOperator("%");
    else if (key === "Enter" || key === "=") { event.preventDefault(); evaluate(); }
    else if (key === "Backspace") deleteLast();
    else if (key === "Escape") allClear();
    else if (key === "Delete") clearEntry();
    else return; // unhandled key

    render();
  });

  /* ---------- Theme Toggle ---------- */
  btnTheme.addEventListener("click", () => {
    const root = document.documentElement;
    const isLight = root.dataset.theme === "light";
    root.dataset.theme = isLight ? "dark" : "light";
    btnTheme.setAttribute("aria-pressed", String(isLight));
  });

  /* ---------- Copy Result ---------- */
  btnCopy.addEventListener("click", () => {
    const text = displayCurrent.textContent;
    if (text && text !== "Error") {
      navigator.clipboard?.writeText(text).catch(() => {});
      btnCopy.textContent = "✓";
      setTimeout(() => (btnCopy.textContent = "⧉"), 1000);
    }
  });

  /* ---------- Clear History ---------- */
  btnClearHistory.addEventListener("click", () => {
    historyList.innerHTML = "";
  });

  /* ---------- Initial Paint ---------- */
  render();
})();
