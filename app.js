// =====================================================
// TRADERPROMULA MATCHES ANALYZER
// Deriv public WebSocket market data
// =====================================================

// IMPORTANT:
// Replace YOUR_DERIV_APP_ID with your own Deriv Developer App ID.
const DERIV_APP_ID = "3480OibNUJ8jFhFXvevX8";

const WS_URL =
  `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`;


// -----------------------------------------------------
// STATE
// -----------------------------------------------------

let socket = null;
let running = false;

let selectedMarket = "R_75";
let selectedWindow = 500;

let ticks = [];
let lastPrice = null;
let currentDigit = null;


// -----------------------------------------------------
// MARKET NAMES
// -----------------------------------------------------

const marketNames = {
  R_10: "Volatility 10 Index",
  R_25: "Volatility 25 Index",
  R_50: "Volatility 50 Index",
  R_75: "Volatility 75 Index",
  R_100: "Volatility 100 Index"
};


// -----------------------------------------------------
// ELEMENTS
// -----------------------------------------------------

const marketSelect = document.getElementById("market");
const windowSelect = document.getElementById("window");

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");

const connectionStatus =
  document.getElementById("connectionStatus");

const marketName =
  document.getElementById("marketName");

const livePrice =
  document.getElementById("livePrice");

const lastDigit =
  document.getElementById("lastDigit");

const tickCount =
  document.getElementById("tickCount");

const matches =
  document.getElementById("matches");

const differs =
  document.getElementById("differs");

const matchRate =
  document.getElementById("matchRate");

const windowLabel =
  document.getElementById("windowLabel");

const digitGrid =
  document.getElementById("digitGrid");

const recentDigits =
  document.getElementById("recentDigits");

const hotDigit =
  document.getElementById("hotDigit");

const coldDigit =
  document.getElementById("coldDigit");

const currentDigitElement =
  document.getElementById("currentDigit");

const dataStatus =
  document.getElementById("dataStatus");


// -----------------------------------------------------
// CONNECTION STATUS
// -----------------------------------------------------

function setConnectionStatus(message, connected = false) {

  connectionStatus.textContent =
    connected ? `● ${message}` : `● ${message}`;

  connectionStatus.style.color =
    connected ? "#39d98a" : "#ff6575";
}


// -----------------------------------------------------
// GET LAST DIGIT
// -----------------------------------------------------

function getLastDigit(price) {

  const text = String(price);

  const numbersOnly =
    text.replace(/\D/g, "");

  if (!numbersOnly) {
    return null;
  }

  return Number(
    numbersOnly[numbersOnly.length - 1]
  );
}


// -----------------------------------------------------
// START
// -----------------------------------------------------

function startAnalysis() {

  if (DERIV_APP_ID === "YOUR_DERIV_APP_ID") {

    alert(
      "Add your Deriv Developer App ID inside app.js first."
    );

    return;
  }


  stopAnalysis();


  selectedMarket =
    marketSelect.value;

  selectedWindow =
    Number(windowSelect.value);


  ticks = [];

  currentDigit = null;

  lastPrice = null;


  marketName.textContent =
    marketNames[selectedMarket] ||
    selectedMarket;


  windowLabel.textContent =
    `${selectedWindow.toLocaleString()} Ticks`;


  dataStatus.textContent =
    "Connecting...";


  setConnectionStatus(
    "CONNECTING..."
  );


  socket =
    new WebSocket(WS_URL);


  // ---------------------------------------------------
  // CONNECTED
  // ---------------------------------------------------

  socket.onopen = function () {

    running = true;


    setConnectionStatus(
      "CONNECTED",
      true
    );


    dataStatus.textContent =
      "LIVE";


    // Subscribe to live ticks
    socket.send(
      JSON.stringify({

        ticks: selectedMarket,

        subscribe: 1

      })
    );

  };


  // ---------------------------------------------------
  // MESSAGE
  // ---------------------------------------------------

  socket.onmessage = function (event) {

    try {

      const data =
        JSON.parse(event.data);


      // API error
      if (data.error) {

        console.error(
          data.error
        );

        dataStatus.textContent =
          data.error.message ||
          "API Error";

        return;
      }


      // Tick received
      if (data.tick) {

        processTick(
          data.tick
        );

      }

    }

    catch (error) {

      console.error(
        "Message error:",
        error
      );

    }

  };


  // ---------------------------------------------------
  // ERROR
  // ---------------------------------------------------

  socket.onerror = function (error) {

    console.error(
      "WebSocket error:",
      error
    );


    setConnectionStatus(
      "CONNECTION ERROR"
    );


    dataStatus.textContent =
      "Connection error";

  };


  // ---------------------------------------------------
  // CLOSED
  // ---------------------------------------------------

  socket.onclose = function () {

    running = false;


    setConnectionStatus(
      "DISCONNECTED"
    );


    if (dataStatus.textContent !== "Stopped") {

      dataStatus.textContent =
        "Disconnected";

    }

  };

}


// -----------------------------------------------------
// PROCESS TICK
// -----------------------------------------------------

function processTick(tick) {

  lastPrice =
    Number(tick.quote);


  currentDigit =
    getLastDigit(tick.quote);


  if (currentDigit === null) {
    return;
  }


  ticks.push({
    price: lastPrice,
    digit: currentDigit,
    time: new Date()
  });


  // Keep maximum 1,000 ticks
  if (ticks.length > 1000) {

    ticks.shift();

  }


  updateInterface();

}


// -----------------------------------------------------
// STOP
// -----------------------------------------------------

function stopAnalysis() {

  running = false;


  if (socket) {

    try {

      socket.send(
        JSON.stringify({
          forget_all: "ticks"
        })
      );

    }

    catch (error) {

      console.log(
        "Subscription already closed."
      );

    }


    socket.close();

    socket = null;

  }


  setConnectionStatus(
    "DISCONNECTED"
  );


  dataStatus.textContent =
    "Stopped";

}


// -----------------------------------------------------
// UPDATE INTERFACE
// -----------------------------------------------------

function updateInterface() {

  const data =
    ticks.slice(-selectedWindow);


  // Price
  livePrice.textContent =
    lastPrice !== null
      ? lastPrice
      : "—";


  // Last digit
  lastDigit.textContent =
    currentDigit !== null
      ? currentDigit
      : "—";


  // Current digit
  currentDigitElement.textContent =
    currentDigit !== null
      ? currentDigit
      : "—";


  // Tick count
  tickCount.textContent =
    data.length;


  // Window
  windowLabel.textContent =
    `${selectedWindow.toLocaleString()} Ticks`;


  // ---------------------------------------------------
  // DIGIT COUNTS
  // ---------------------------------------------------

  const counts =
    Array(10).fill(0);


  data.forEach(item => {

    counts[item.digit]++;

  });


  // ---------------------------------------------------
  // MATCHES / DIFFERS
  //
  // The current digit is used as the target digit.
  // This shows how often the current digit occurred
  // inside the selected historical window.
  // ---------------------------------------------------

  let matchCount = 0;


  if (
    currentDigit !== null &&
    data.length > 0
  ) {

    matchCount =
      data.filter(
        item =>
          item.digit === currentDigit
      ).length;

  }


  const differCount =
    data.length - matchCount;


  const percentage =
    data.length > 0
      ? (matchCount / data.length) * 100
      : 0;


  matches.textContent =
    matchCount;


  differs.textContent =
    differCount;


  matchRate.textContent =
    data.length > 0
      ? `${percentage.toFixed(2)}%`
      : "—";


  // ---------------------------------------------------
  // DIGIT CARDS
  // ---------------------------------------------------

  digitGrid.innerHTML = "";


  counts.forEach(
    (count, digit) => {

      const percentage =
        data.length > 0
          ? (count / data.length) * 100
          : 0;


      const card =
        document.createElement("div");


      card.className =
        "digitCard";


      card.innerHTML = `

        <div class="digitTitle">

          <span>Digit ${digit}</span>

          <span>
            ${percentage.toFixed(1)}%
          </span>

        </div>

        <div class="progress">

          <div
            class="progressBar"
            style="width:${percentage}%">
          </div>

        </div>

        <div class="digitCount">

          ${count} occurrence${count === 1 ? "" : "s"}

        </div>

      `;


      digitGrid.appendChild(card);

    }
  );


  // ---------------------------------------------------
  // HOT DIGIT
  // ---------------------------------------------------

  const highest =
    Math.max(...counts);


  if (data.length > 0) {

    const hotDigits = [];


    counts.forEach(
      (count, digit) => {

        if (count === highest) {

          hotDigits.push(digit);

        }

      }
    );


    hotDigit.textContent =
      hotDigits.join(", ");

  }

  else {

    hotDigit.textContent =
      "—";

  }


  // ---------------------------------------------------
  // COLD DIGIT
  // ---------------------------------------------------

  const lowest =
    Math.min(...counts);


  if (data.length > 0) {

    const coldDigits = [];


    counts.forEach(
      (count, digit) => {

        if (count === lowest) {

          coldDigits.push(digit);

        }

      }
    );


    coldDigit.textContent =
      coldDigits.join(", ");

  }

  else {

    coldDigit.textContent =
      "—";

  }


  // ---------------------------------------------------
  // RECENT DIGITS
  // ---------------------------------------------------

  recentDigits.innerHTML = "";


  const recent =
    data.slice(-40);


  recent.forEach(
    item => {

      const element =
        document.createElement("span");


      element.textContent =
        item.digit;


      recentDigits.appendChild(
        element
      );

    }
  );

}


// -----------------------------------------------------
// BUTTON EVENTS
// -----------------------------------------------------

startButton.addEventListener(
  "click",
  startAnalysis
);


stopButton.addEventListener(
  "click",
  stopAnalysis
);


// -----------------------------------------------------
// MARKET CHANGE
// -----------------------------------------------------

marketSelect.addEventListener(
  "change",
  function () {

    marketName.textContent =
      marketNames[this.value] ||
      this.value;


    if (running) {

      startAnalysis();

    }

  }
);


// -----------------------------------------------------
// WINDOW CHANGE
// -----------------------------------------------------

windowSelect.addEventListener(
  "change",
  function () {

    selectedWindow =
      Number(this.value);


    windowLabel.textContent =
      `${selectedWindow.toLocaleString()} Ticks`;


    updateInterface();

  }
);


// -----------------------------------------------------
// INITIAL DISPLAY
// -----------------------------------------------------

marketName.textContent =
  marketNames[marketSelect.value];


windowLabel.textContent =
  `${windowSelect.value} Ticks`;


setConnectionStatus(
  "DISCONNECTED"
);


dataStatus.textContent =
  "Waiting";
