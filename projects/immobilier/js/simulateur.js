/* Horizon Immobilier - mortgage simulator: sliders, results, SVG amortization chart and table */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const CHART_DIMENSIONS = { width: 720, height: 320, paddingLeft: 58, paddingRight: 58, paddingTop: 16, paddingBottom: 34 };
const CHART_COLORS = { principal: "#1f4f40", interest: "#cdae6c", balance: "#b4432f", grid: "#e2e0d9" };
const NOTARY_FEES_RATIO = 0.075;

const simulatorControlElements = {
  propertyPrice: document.getElementById("property-price"),
  depositAmount: document.getElementById("deposit-amount"),
  interestRate: document.getElementById("interest-rate"),
  loanDuration: document.getElementById("loan-duration")
};

let latestYearlySchedule = [];

/* Formats large euro values in a compact way for chart axes */
function formatCompactEuros(numericValue) {
  if (numericValue >= 1000000) {
    return formatNumber(numericValue / 1000000, 1) + " M€";
  }
  if (numericValue >= 1000) {
    return formatNumber(Math.round(numericValue / 1000)) + " k€";
  }
  return formatEuros(numericValue);
}

/* Builds the amortization schedule aggregated by year */
function buildYearlyAmortizationSchedule(loanPrincipal, annualRatePercent, durationInYears) {
  const monthlyRate = annualRatePercent / 100 / 12;
  const monthlyPayment = computeMonthlyLoanPayment(loanPrincipal, annualRatePercent, durationInYears);
  const yearlySchedule = [];
  let remainingBalance = loanPrincipal;
  for (let yearNumber = 1; yearNumber <= durationInYears; yearNumber += 1) {
    let yearlyPrincipal = 0;
    let yearlyInterest = 0;
    for (let monthNumber = 0; monthNumber < 12; monthNumber += 1) {
      const monthlyInterest = remainingBalance * monthlyRate;
      const monthlyPrincipal = Math.min(monthlyPayment - monthlyInterest, remainingBalance);
      yearlyInterest += monthlyInterest;
      yearlyPrincipal += monthlyPrincipal;
      remainingBalance -= monthlyPrincipal;
    }
    yearlySchedule.push({ year: yearNumber, principal: yearlyPrincipal, interest: yearlyInterest, payments: yearlyPrincipal + yearlyInterest, balance: Math.max(remainingBalance, 0) });
  }
  return yearlySchedule;
}

/* Creates an SVG element with attributes */
function createSvgElement(tagName, attributeMap) {
  const svgElement = document.createElementNS(SVG_NAMESPACE, tagName);
  Object.keys(attributeMap).forEach(function (attributeName) {
    svgElement.setAttribute(attributeName, attributeMap[attributeName]);
  });
  return svgElement;
}

/* Draws stacked yearly bars (principal and interest) and the remaining balance line */
function renderAmortizationChart(yearlySchedule, loanPrincipal) {
  const chartElement = document.getElementById("amortization-chart");
  const plotWidth = CHART_DIMENSIONS.width - CHART_DIMENSIONS.paddingLeft - CHART_DIMENSIONS.paddingRight;
  const plotHeight = CHART_DIMENSIONS.height - CHART_DIMENSIONS.paddingTop - CHART_DIMENSIONS.paddingBottom;
  const plotBottom = CHART_DIMENSIONS.paddingTop + plotHeight;
  const maximumYearlyPayment = Math.max.apply(null, yearlySchedule.map(function (yearEntry) { return yearEntry.payments; })) || 1;
  const maximumBalance = loanPrincipal || 1;
  const columnWidth = plotWidth / yearlySchedule.length;
  const barWidth = Math.max(columnWidth * 0.62, 2);
  const labelEvery = yearlySchedule.length > 20 ? 5 : yearlySchedule.length > 10 ? 2 : 1;
  chartElement.replaceChildren();
  [0, 0.25, 0.5, 0.75, 1].forEach(function (gridRatio) {
    const gridY = plotBottom - plotHeight * gridRatio;
    chartElement.appendChild(createSvgElement("line", { x1: CHART_DIMENSIONS.paddingLeft, x2: CHART_DIMENSIONS.width - CHART_DIMENSIONS.paddingRight, y1: gridY, y2: gridY, stroke: CHART_COLORS.grid, "stroke-dasharray": gridRatio === 0 ? "" : "3 4" }));
    const leftLabel = createSvgElement("text", { x: CHART_DIMENSIONS.paddingLeft - 8, y: gridY + 4, "text-anchor": "end" });
    leftLabel.textContent = formatCompactEuros(maximumYearlyPayment * gridRatio);
    chartElement.appendChild(leftLabel);
    const rightLabel = createSvgElement("text", { x: CHART_DIMENSIONS.width - CHART_DIMENSIONS.paddingRight + 8, y: gridY + 4, "text-anchor": "start" });
    rightLabel.textContent = formatCompactEuros(maximumBalance * gridRatio);
    chartElement.appendChild(rightLabel);
  });
  const balancePoints = [CHART_DIMENSIONS.paddingLeft + "," + (plotBottom - plotHeight)];
  yearlySchedule.forEach(function (yearEntry, yearIndex) {
    const columnX = CHART_DIMENSIONS.paddingLeft + yearIndex * columnWidth;
    const barX = columnX + (columnWidth - barWidth) / 2;
    const principalHeight = plotHeight * yearEntry.principal / maximumYearlyPayment;
    const interestHeight = plotHeight * yearEntry.interest / maximumYearlyPayment;
    const columnGroup = createSvgElement("g", { class: "chart-column", "data-year-index": yearIndex });
    columnGroup.appendChild(createSvgElement("rect", { x: columnX, y: CHART_DIMENSIONS.paddingTop, width: columnWidth, height: plotHeight, fill: "transparent" }));
    columnGroup.appendChild(createSvgElement("rect", { class: "chart-bar", x: barX, y: plotBottom - principalHeight, width: barWidth, height: principalHeight, fill: CHART_COLORS.principal, rx: 2 }));
    columnGroup.appendChild(createSvgElement("rect", { class: "chart-bar", x: barX, y: plotBottom - principalHeight - interestHeight, width: barWidth, height: interestHeight, fill: CHART_COLORS.interest, rx: 2 }));
    chartElement.appendChild(columnGroup);
    if ((yearIndex + 1) % labelEvery === 0 || yearIndex === 0) {
      const yearLabel = createSvgElement("text", { x: columnX + columnWidth / 2, y: plotBottom + 20, "text-anchor": "middle" });
      yearLabel.textContent = yearEntry.year;
      chartElement.appendChild(yearLabel);
    }
    balancePoints.push((columnX + columnWidth) + "," + (plotBottom - plotHeight * yearEntry.balance / maximumBalance));
  });
  chartElement.appendChild(createSvgElement("polyline", { points: balancePoints.join(" "), fill: "none", stroke: CHART_COLORS.balance, "stroke-width": 2.5, "stroke-linejoin": "round", "pointer-events": "none" }));
}

/* Fills the yearly amortization table */
function renderAmortizationTable(yearlySchedule) {
  document.getElementById("amortization-table-body").innerHTML = yearlySchedule.map(function (yearEntry) {
    return "<tr><td>Année " + yearEntry.year + "</td><td>" + formatEuros(yearEntry.payments) + "</td><td>" + formatEuros(yearEntry.principal) + "</td><td>" + formatEuros(yearEntry.interest) + "</td><td>" + formatEuros(yearEntry.balance) + "</td></tr>";
  }).join("");
}

/* Shows the detail of a hovered or focused chart year */
function describeChartYear(yearIndex) {
  const yearEntry = latestYearlySchedule[yearIndex];
  if (!yearEntry) {
    return;
  }
  document.getElementById("chart-tooltip").innerHTML = "<strong>Année " + yearEntry.year + "</strong> — capital remboursé " + formatEuros(yearEntry.principal) + ", intérêts " + formatEuros(yearEntry.interest) + ", restant dû " + formatEuros(yearEntry.balance);
}

/* Reads every slider, refreshes outputs, results, chart and table */
function updateMortgageSimulation() {
  const propertyPrice = Number(simulatorControlElements.propertyPrice.value);
  simulatorControlElements.depositAmount.max = Math.min(propertyPrice, 1000000);
  const depositAmount = Math.min(Number(simulatorControlElements.depositAmount.value), propertyPrice);
  const interestRate = Number(simulatorControlElements.interestRate.value);
  const loanDuration = Number(simulatorControlElements.loanDuration.value);
  const loanPrincipal = Math.max(propertyPrice - depositAmount, 0);
  const monthlyPayment = computeMonthlyLoanPayment(loanPrincipal, interestRate, loanDuration);
  const totalRepaid = monthlyPayment * loanDuration * 12;
  const interestCost = Math.max(totalRepaid - loanPrincipal, 0);
  const notaryFees = propertyPrice * NOTARY_FEES_RATIO;
  document.getElementById("property-price-output").textContent = formatEuros(propertyPrice);
  document.getElementById("deposit-amount-output").textContent = formatEuros(depositAmount) + " (" + formatNumber(propertyPrice ? depositAmount / propertyPrice * 100 : 0) + " %)";
  document.getElementById("interest-rate-output").textContent = formatNumber(interestRate, 2) + " %";
  document.getElementById("loan-duration-output").textContent = loanDuration + " ans";
  document.getElementById("monthly-payment-output").textContent = formatNumber(Math.round(monthlyPayment));
  document.getElementById("recommended-income-output").textContent = formatEuros(Math.round(monthlyPayment / 0.35));
  document.getElementById("loan-amount-output").textContent = formatEuros(loanPrincipal);
  document.getElementById("interest-cost-output").textContent = formatEuros(interestCost);
  document.getElementById("total-cost-output").textContent = formatEuros(propertyPrice + interestCost + notaryFees);
  document.getElementById("notary-fees-output").textContent = formatEuros(notaryFees);
  document.getElementById("breakdown-principal").style.width = (totalRepaid ? loanPrincipal / totalRepaid * 100 : 100) + "%";
  document.getElementById("breakdown-interest").style.width = (totalRepaid ? interestCost / totalRepaid * 100 : 0) + "%";
  latestYearlySchedule = buildYearlyAmortizationSchedule(loanPrincipal, interestRate, loanDuration);
  renderAmortizationChart(latestYearlySchedule, loanPrincipal);
  renderAmortizationTable(latestYearlySchedule);
}

/* Applies optional price and deposit values passed in the URL */
function applySimulatorUrlParameters() {
  const urlParameters = new URLSearchParams(window.location.search);
  const requestedPrice = Number(urlParameters.get("prix"));
  const requestedDeposit = Number(urlParameters.get("apport"));
  if (requestedPrice) {
    simulatorControlElements.propertyPrice.value = requestedPrice;
  }
  if (requestedDeposit || requestedDeposit === 0 && urlParameters.has("apport")) {
    simulatorControlElements.depositAmount.max = Math.min(Number(simulatorControlElements.propertyPrice.value), 1000000);
    simulatorControlElements.depositAmount.value = requestedDeposit;
  }
}

/* Wires the simulator controls and the chart interactions */
function initializeMortgageSimulator() {
  const chartElement = document.getElementById("amortization-chart");
  applySimulatorUrlParameters();
  document.getElementById("mortgage-simulator-form").addEventListener("input", updateMortgageSimulation);
  document.getElementById("mortgage-simulator-form").addEventListener("submit", function (submitEvent) { submitEvent.preventDefault(); });
  chartElement.addEventListener("mouseover", function (pointerEvent) {
    const columnGroupElement = pointerEvent.target.closest(".chart-column");
    if (columnGroupElement) {
      describeChartYear(Number(columnGroupElement.dataset.yearIndex));
    }
  });
  chartElement.addEventListener("click", function (pointerEvent) {
    const columnGroupElement = pointerEvent.target.closest(".chart-column");
    if (columnGroupElement) {
      describeChartYear(Number(columnGroupElement.dataset.yearIndex));
    }
  });
  updateMortgageSimulation();
}

document.addEventListener("DOMContentLoaded", initializeMortgageSimulator);
