const brackets2024 = [
  { rate: 0, max: 0 },
  { rate: 0.1, max: 11_600 },
  { rate: 0.12, max: 47_150 },
  { rate: 0.22, max: 100_525 },
  { rate: 0.24, max: 191_950 },
  { rate: 0.32, max: 243_725 },
  { rate: 0.35, max: 609_350 },
  { rate: 0.37, max: Infinity },
];

const rootForm = document.querySelector("form");
calc();

function main() {
  // auto summit on change
  rootForm.addEventListener("input", function (_event) {
    calc();
  });

  rootForm.addEventListener("submit", function (event) {
    event.preventDefault();
    calc();
  });
}

function calc() {
  const expectedAnnualIncome = Math.max(0, rootForm.querySelector(`input[name="expectedAnnualIncome"]`).valueAsNumber);
  const incomeYtd = Math.max(0, rootForm.querySelector(`input[name="incomeYtd"]`).valueAsNumber);
  const taxDeductedYtd = Math.max(0, rootForm.querySelector(`input[name="taxDeductedYtd"]`).valueAsNumber);
  const estimatedTaxPaidYtd = Math.max(0, rootForm.querySelector(`input[name="estimatedTaxPaidYtd"]`).valueAsNumber);

  const filledBrackets = prepareBrackets(brackets2024)
    .map(({ rate, min, max }) => {
      const applicable = expectedAnnualIncome > min;
      const taxable = Math.min(max, Math.max(expectedAnnualIncome, min)) - min;

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

  const total = filledBrackets.reduce((acc, { tax }) => acc + tax, 0);
  const effectiveTaxRate = coerceNaN(total / expectedAnnualIncome, 0);
  const summary = { expectedIncome: expectedAnnualIncome, total, effectiveTaxRate };

  document.querySelector("tbody#worksheet").innerHTML = renderWorksheet(filledBrackets, summary);

  const taxExpectedYtd = incomeYtd * effectiveTaxRate;
  const balanceYtd = taxExpectedYtd - taxDeductedYtd;

  const balanceInput = {
    incomeYtd,
    effectiveTaxRate,
    taxExpectedYtd,
    taxDeductedYtd,
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

function renderWorksheet(filledBrackets, summary) {
  return [
    ...filledBrackets.map(
      ({ rate, min, max, taxable, tax, applicable }) =>
        `
    <tr data-applicable=${applicable}>
      <td>${(rate * 100).toFixed(0)}%</td>
      <td>${min}</td>
      <td>${max}</td>
      <td>${taxable}</td>
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

function renderBalance(input) {
  return `
  <tr>
    <th>Income</th>
    <td>${input.incomeYtd.toFixed(2)}</td>
  </tr>
  <tr>
    <th>Effective tax rate</th>
    <td>× ${(input.effectiveTaxRate * 100).toFixed(2)}%</td>
  </tr>
  <tr>
    <th colspan="2"><hr></th>
  </tr>
  <tr>
    <th>Tax</th>
    <td>${input.taxExpectedYtd.toFixed(2)}</td>
  </tr>
  <tr>
    <th>Deducted</th>
    <td>-${input.taxDeductedYtd.toFixed(2)}</td>
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

function coerceNaN(maybeNaN, value) {
  return isNaN(maybeNaN) ? value : maybeNaN;
}

main();
