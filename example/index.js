import {Sankey} from "../dist/index.js";

window.addEventListener('load', () => {
	const sankey = new Sankey();
	
	const salary = sankey.node("Salary", 50000);
	const bonus = sankey.node("Bonus", 5000);
	const employer = sankey.node("Employer");
	const government = sankey.node("Government");
	
	const income = sankey.node("Income");
	sankey.edge(salary, income, salary.remainingOutput);
	sankey.edge(bonus, income, bonus.remainingOutput);
	
	const pension = sankey.node("Pension");
	sankey.edge(income, pension, income.requiredOutput * 0.1);
	sankey.edge(employer, pension, pension.currentInput);
	
	const taxable = sankey.node("Taxable");
	sankey.edge(income, taxable, income.remainingOutput);
	
	const tax = sankey.node("Tax");
	sankey.edge(taxable, tax, applyTax(taxable.requiredOutput, taxBands));
	
	const nationalInsurance = sankey.node("National Insurance", applyTax(taxable.requiredOutput, nationalInsuranceBands));
	sankey.edge(taxable, nationalInsurance, applyTax(taxable.requiredOutput, nationalInsuranceContrubutionBands));
	sankey.edge(employer, nationalInsurance, nationalInsurance.remainingInput);
	
	const studentLoan = sankey.node("Student Loan");
	sankey.edge(taxable, studentLoan, applyTax(taxable.requiredOutput, studentLoanBands));
	
	const rent = sankey.node("Rent", 8400);
	sankey.edge(taxable, rent, rent.requiredInput);
	
	const bills = sankey.node("Bills", 1000);
	sankey.edge(taxable, bills, bills.requiredInput);
	
	const food = sankey.node("Food", 2500);
	sankey.edge(taxable, food, food.requiredInput);
	
	const travel = sankey.node("Travel", 5000);
	sankey.edge(taxable, travel, travel.requiredInput);
	
	const other = sankey.node("Other", 2000);
	sankey.edge(taxable, other, other.requiredInput);
	
	if (taxable.remainingOutput > 0) {
		const lisa = sankey.node("LISA");
		sankey.edge(taxable, lisa, Math.min(taxable.remainingOutput, 4000));
		sankey.edge(government, lisa, lisa.currentInput * 0.25);
	}
	
	if (taxable.remainingOutput > 0) {
		const isa = sankey.node("ISA");
		sankey.edge(taxable, isa, Math.min(taxable.remainingOutput, 16000));
	}
	
	if (taxable.remainingOutput > 0) {
		const savings = sankey.node("Savings");
		sankey.edge(taxable, savings, taxable.remainingOutput);
	}
	
	const canvas = document.getElementById('canvas');
	const ctx = canvas.getContext('2d');
	sankey.draw(ctx, {numberFormat: new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'GBP'})});
});

const taxBands = [
	{max: 12570, rate: 0},
	{max: 50270, rate: 0.2},
	{max: 100000, rate: 0.4},
	{max: 125140, rate: 0.6},
	{max: 150000, rate: 0.4},
	{max: Infinity, rate: 0.45},
];

const nationalInsuranceContrubutionBands = [
	{max: 12570, rate: 0},
	{max: 50270, rate: 0.1325},
	{max: Infinity, rate: 0.0325},
];

const nationalInsuranceBands = [
	{max: 9100, rate: 0},
	{max: Infinity, rate: 0.1505},
];

const studentLoanBands = [
	{max: 27295, rate: 0},
	{max: Infinity, rate: 0.09},
];

function applyTax(income, bands) {
	let tax = 0;
	for (const {max, rate} of bands) {
		tax += rate * Math.min(income, max);
		income -= max;
		if (income <= 0) break;
	}
	return tax;
}

function log(...args) {
	console.log(...args);
	return args[0];
}
