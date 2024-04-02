const storageKey = `params-${globalThis.year}`;
const rootForm = document.querySelector("form");

document.querySelector("h1").textContent = `Tax sheets ${globalThis.year}`;

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
}

function restoreParams() {
  const serialized = localStorage.getItem(storageKey);
  const deserialized = new URLSearchParams(serialized);
  rootForm.querySelectorAll("input").forEach((input) => {
    const name = input.getAttribute("name");
    const value = deserialized.get(name);
    if (value) {
      input.value = value;
    }
  });
}

function calc() {
  const expectedAnnualIncome = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="expectedAnnualIncome"]`).valueAsNumber));
  const incomeYtd = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="incomeYtd"]`).valueAsNumber));
  const taxWithheldYtd = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="taxWithheldYtd"]`).valueAsNumber));
  const estimatedTaxPaidYtd = coerceNaNTo(0, Math.max(0, rootForm.querySelector(`input[name="estimatedTaxPaidYtd"]`).valueAsNumber));

  const filledBrackets = prepareBrackets(globalThis.brackets)
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
  const effectiveTaxRate = coerceNaNTo(0, total / expectedAnnualIncome);
  const summary = { expectedIncome: expectedAnnualIncome, total, effectiveTaxRate };

  document.querySelector("tbody#worksheet").innerHTML = renderWorksheet(filledBrackets, summary);

  const taxExpectedYtd = incomeYtd * effectiveTaxRate;
  const balanceYtd = taxExpectedYtd - taxWithheldYtd;

  const balanceInput = {
    incomeYtd,
    effectiveTaxRate,
    taxExpectedYtd,
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

function renderWorksheet(filledBrackets, summary) {
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
