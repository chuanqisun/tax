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

function main() {
  rootForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const taxableIncome = Math.max(0, rootForm.querySelector(`input[name="taxableIncome"]`).valueAsNumber);
    const filledBrackets = prepareBrackets(brackets2024)
      .map(({ rate, min, max }) => {
        const applicable = taxableIncome > min;
        const taxable = Math.min(max, Math.max(taxableIncome, min)) - min;

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

    console.log(filledBrackets);

    const total = filledBrackets.reduce((acc, { tax }) => acc + tax, 0);
    const effectiveTaxRate = total / taxableIncome;
    const summary = { total, effectiveTaxRate };

    document.querySelector("tbody#worksheet").innerHTML = renderWorksheet(filledBrackets, summary);
    const html = renderSummary({ total, effectiveTaxRate });
    console.log(html);
  });
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
      <td></td>
      <td><b>${summary.total.toFixed(2)}</b></td>
    </tr>
      `,
  ].join("\n");
}
main();
