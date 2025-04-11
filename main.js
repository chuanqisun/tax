const year = 2025;
const schedules = {
  single: {
    incomeBrackets: [
      { rate: 0, max: 0 },
      { rate: 0.1, max: 11_925 },
      { rate: 0.12, max: 48_475 },
      { rate: 0.22, max: 103_350 },
      { rate: 0.24, max: 197_300 },
      { rate: 0.32, max: 250_525 },
      { rate: 0.35, max: 626_350 },
      { rate: 0.37, max: Infinity },
    ],
    longTermCapitalGainBrackets: [
      { rate: 0, max: 47_025 },
      { rate: 0.15, max: 518_900 },
      { rate: 0.2, max: Infinity },
    ],
    standardDeduction: 15_000,
  },
  "married-filing-jointly": {
    incomeBrackets: [
      { rate: 0, max: 0 },
      { rate: 0.1, max: 23_850 },
      { rate: 0.12, max: 96_950 },
      { rate: 0.22, max: 206_700 },
      { rate: 0.24, max: 394_600 },
      { rate: 0.32, max: 501_050 },
      { rate: 0.35, max: 751_600 },
      { rate: 0.37, max: Infinity },
    ],
    longTermCapitalGainRates: [
      { rate: 0, max: 94_050 },
      { rate: 0.15, max: 583_750 },
      { rate: 0.2, max: Infinity },
    ],
    standardDeduction: 30_000,
  },
  "married-filing-separately": {
    incomeBrackets: [
      { rate: 0, max: 0 },
      { rate: 0.1, max: 11_925 },
      { rate: 0.12, max: 48_475 },
      { rate: 0.22, max: 103_350 },
      { rate: 0.24, max: 197_300 },
      { rate: 0.32, max: 250_525 },
      { rate: 0.35, max: 375_800 },
      { rate: 0.37, max: Infinity },
    ],
    longTermCapitalGainRates: [
      { rate: 0, max: 47_025 },
      { rate: 0.15, max: 291_850 },
      { rate: 0.2, max: Infinity },
    ],
    standardDeduction: 15_000,
  },
  "head-of-household": {
    incomeBrackets: [
      { rate: 0, max: 0 },
      { rate: 0.1, max: 17_000 },
      { rate: 0.12, max: 64_850 },
      { rate: 0.22, max: 103_350 },
      { rate: 0.24, max: 197_300 },
      { rate: 0.32, max: 250_500 },
      { rate: 0.35, max: 626_350 },
      { rate: 0.37, max: Infinity },
    ],
    longTermCapitalGainRates: [
      { rate: 0, max: 63_000 },
      { rate: 0.15, max: 551_350 },
      { rate: 0.2, max: Infinity },
    ],
    standardDeduction: 22_500,
  },
};

const storageKey = `params-${year}`;
const rootForm = document.querySelector("form");

renderColorScheme();
restoreParams();
calc();

function main() {
  // auto summit on change
  rootForm.addEventListener("input", function (_event) {
    calc();

    // store params
    const formData = new FormData(rootForm);
    const serialized = new URLSearchParams(formData).toString();
    localStorage.setItem(storageKey, serialized);
  });

  rootForm.addEventListener("submit", function (event) {
    event.preventDefault();
    calc();
  });

  rootForm.querySelector(`button[type="reset"]`).addEventListener("click", function (event) {
    event.preventDefault();
    localStorage.removeItem(storageKey);
    rootForm.reset();
    calc();
  });

  rootForm.addEventListener("click", (e) => {
    const action = e.target?.closest("[data-action]")?.getAttribute("data-action");
    switch (action) {
      case "apply-std-deduction": {
        const status = rootForm.querySelector(`input[name="filingStatus"]:checked`).value;
        const standardDeduction = schedules[status].standardDeduction;
        rootForm.querySelector(`input[name="expectedDeduction"]`).value = standardDeduction;
        calc();
        break;
      }
    }
  });
}

function renderColorScheme() {
  const preferred = new URLSearchParams(window.location.search).get("color-scheme");
  if (preferred) {
    document.body.setAttribute("data-color-scheme", preferred);
  }
}

function restoreParams() {
  const serialized = localStorage.getItem(storageKey);
  const deserialized = new URLSearchParams(serialized);
  rootForm.querySelectorAll("input").forEach((input) => {
    const name = input.getAttribute("name");
    const value = deserialized.get(name);
    if (value) {
      switch (input.type) {
        case "checkbox":
          input.checked = value === "on";
          break;
        case "radio":
          if (input.value === value) {
            input.checked = true;
          }
          break;
        default:
          input.value = value;
      }
    }
  });
}

function calc() {
  const filingStatus = rootForm.querySelector(`input[name="filingStatus"]:checked`).value;
  const expectedAnnualIncome = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="expectedAnnualIncome"]`).valueAsNumber));
  const expectedDeduction = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="expectedDeduction"]`).valueAsNumber));
  const incomeYtd = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="incomeYtd"]`).valueAsNumber));
  const shortTermCapitalGainsYtd = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="shortTermCapitalGainsYtd"]`).valueAsNumber));
  const longTermCapitalGainsYtd = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="longTermCapitalGainsYtd"]`).valueAsNumber));
  const taxWithheldYtd = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="taxWithheldYtd"]`).valueAsNumber));
  const estimatedTaxPaidYtd = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="estimatedTaxPaidYtd"]`).valueAsNumber));
  const expectedTaxableIncome = Math.max(0, expectedAnnualIncome - expectedDeduction);

  const schedule = schedules[filingStatus];
  const standardDeduction = schedule.standardDeduction;

  renderInputFormValues(expectedTaxableIncome, standardDeduction);

  const filledBrackets = prepareBrackets(schedule.incomeBrackets)
    .map(({ rate, min, max }) => {
      const applicable = expectedTaxableIncome > min;
      const taxable = Math.min(max, Math.max(expectedTaxableIncome, min)) - min;

      return {
        rate,
        min,
        max,
        taxable,
        tax: rate * taxable,
        applicable,
      };
    })
    .slice(1);

  const filledLongTermCapitalGainBrackets = prepareBrackets(schedule.longTermCapitalGainBrackets).map(({ rate, min, max }) => {
    /** Unlike income tax being progressive, long term cap gain is applicable to only a single bracket */
    const applicable = longTermCapitalGainsYtd > min && longTermCapitalGainsYtd <= max;
    const taxable = applicable ? longTermCapitalGainsYtd : 0;
    const tax = rate * taxable;
    return {
      rate,
      min,
      max,
      taxable,
      tax,
      applicable,
    };
  });

  const totalIncomeTax = filledBrackets.reduce((acc, { tax }) => acc + tax, 0);
  const effectiveTaxRate = coerceNaNTo(0, totalIncomeTax / expectedTaxableIncome);
  const summary = { expectedIncome: expectedTaxableIncome, total: totalIncomeTax, effectiveTaxRate };

  const longTermCapitalGainTax = filledLongTermCapitalGainBrackets.reduce((acc, { tax }) => acc + tax, 0);

  document.querySelector("tbody#effective-rate-worksheet").innerHTML = renderEffectiveTaxRateWorksheet(filledBrackets, summary);
  document.querySelector("tbody#long-term-capital-gain-tax-worksheet").innerHTML = renderLongTermCapitalGainWorksheet(filledLongTermCapitalGainBrackets);

  const totalTaxableIncomeYtd = incomeYtd + shortTermCapitalGainsYtd;
  const incomeTaxExpectedYtd = totalTaxableIncomeYtd * effectiveTaxRate;
  const totalTax = incomeTaxExpectedYtd + longTermCapitalGainTax;
  const balanceYtd = totalTax - taxWithheldYtd - estimatedTaxPaidYtd;

  const balanceInput = {
    incomeYtd,
    shortTermCapitalGainsYtd,
    longTermCapitalGainsYtd,
    totalTaxableIncomeYtd,
    effectiveTaxRate,
    incomeTaxExpectedYtd,
    longTermCapitalGainTax,
    totalTax,
    taxWithheldYtd,
    estimatedTaxPaidYtd,
    balanceYtd,
  };
  document.querySelector("tbody#balance").innerHTML = renderBalance(balanceInput);
}

function prepareBrackets(brackets = []) {
  return brackets.map((bracket, index, arr) => {
    const min = arr[index - 1]?.max ?? 0;

    return {
      ...bracket,
      min,
    };
  });
}

function renderInputFormValues(expectedTaxableIncome, standardDeduction) {
  rootForm.querySelector(`input[name="expectedTaxableIncome"]`).value = expectedTaxableIncome;
  rootForm.querySelector(`input[name="expectedDeduction"]`).placeholder = standardDeduction;
}

function renderEffectiveTaxRateWorksheet(filledBrackets, summary) {
  return [
    ...filledBrackets.map(
      ({ rate, min, max, taxable, tax, applicable }) =>
        `
    <tr data-applicable=${applicable}>
      <td>${(rate * 100).toFixed(0)}%</td>
      <td>${min}</td>
      <td>${max}</td>
      <td>${taxable.toFixed(2)}</td>
      <td>${tax.toFixed(2)}</td>
    </tr>
    `
    ),
    `
    <tr>
      <th colspan="5"><hr></th>
    </tr>
    <tr>
      <td><b>${(summary.effectiveTaxRate * 100).toFixed(2)}%</b></td>
      <td></td>
      <td></td>
      <td>${summary.expectedIncome.toFixed(2)}</td>
      <td>${summary.total.toFixed(2)}</td>
    </tr>
      `,
  ].join("\n");
}

function renderLongTermCapitalGainWorksheet(filledBrackets) {
  return [
    ...filledBrackets.map(
      ({ rate, min, max, taxable, tax, applicable }) =>
        `
    <tr data-applicable=${applicable}>
      <td>${(rate * 100).toFixed(0)}%</td>
      <td>${min}</td>
      <td>${max}</td>
      <td>${taxable.toFixed(2)}</td>
      <td>${tax.toFixed(2)}</td>
    </tr>
    `
    ),
  ].join("\n");
}

function renderBalance(input) {
  return `

  <tr>
    <th>Income</th>
    <td>${input.incomeYtd.toFixed(2)}</td>
  </tr>
  <tr>
    <th>Short-term capital gains</th>
    <td>+ ${input.shortTermCapitalGainsYtd.toFixed(2)}</td>
  </tr>
  <tr>
    <th colspan="2"><hr></th>
  </tr>
  <tr>
    <th>Taxable income</th>
    <td>${input.totalTaxableIncomeYtd.toFixed(2)}</td>
  </tr>
  <tr>
    <th>Effective tax rate</th>
    <td>× ${(input.effectiveTaxRate * 100).toFixed(2)}%</td>
  </tr>
  <tr>
    <th colspan="2"><hr></th>
  </tr>
  <tr>
    <th>Income tax</th>
    <td>${input.incomeTaxExpectedYtd.toFixed(2)}</td>
  </tr>
  <tr>
    <th>Long-term capital gain tax</th>
    <td>+ ${input.longTermCapitalGainTax.toFixed(2)}</td>
  </tr>
  <tr>
    <th colspan="2"><hr></th>
  </tr>
  <tr>
    <th>Total tax</th>
    <td>${input.totalTax.toFixed(2)}</td>
  </tr>
  <tr>
    <th>Withheld</th>
    <td>-${input.taxWithheldYtd.toFixed(2)}</td>
  </tr>
  <tr>
    <th>Estimated tax paid</th>
    <td>-${input.estimatedTaxPaidYtd.toFixed(2)}</td>
  </tr>
  <tr>
    <th colspan="2"><hr></th>
  </tr>
  <tr>
    <th>Balance</th>
    <td><b>${input.balanceYtd.toFixed(2)}</b></td>
  </tr>
  </tr>
  `;
}

function coerceNaNTo(coerceTo, maybeNaN) {
  return isNaN(maybeNaN) ? coerceTo : maybeNaN;
}

main();
