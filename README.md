# 🇦🇺 AU Payslip Checker

> A minimalist, privacy-first tool to verify Australian payslips based on 2025 Fair Work standards.

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

---

## 🖥️ Preview

<img width="100%" alt="AU Payslip Checker Preview" src="https://github.com/user-attachments/assets/45cba4d5-e82e-44df-ac43-57322f1de7f1" />

---

## 🧮 Calculation Methodology

This tool follows standard Australian labor guidelines, but please note that specific rules may vary by industry.

### 1. Ordinary vs. Overtime (OT)
- **Weekly Standard**: 38 hours.
- **Daily Limit**: Dynamically calculated as `38 / [Days Worked]`. For a 5-day week, this is **7.6 hours**.
- **Weekday OT**: The first 3 hours of overtime are calculated at **1.5x**, and any hours thereafter at **2x**.

### 2. Weekend & Public Holiday Rules
- **Saturday**: First 3 hours at **1.5x**, thereafter **2x**.
- **Sunday**: All hours at **2x** with a **4-hour minimum payment guarantee**.
- **Public Holiday**: All hours calculated at **2x** (based on common backpacker industry standards).

### 3. Casual Employee Logic
- Overtime and penalty rates are calculated based on the **Base Hourly Rate** (excluding the 25% casual loading).

---

## ⚠️ Disclaimer (免責聲明)

This tool is provided for **informational and estimation purposes only**. 
- **Accuracy**: While we strive for accuracy based on Fair Work standards, payroll logic can differ significantly between **Modern Awards**, **Enterprise Agreements (EA)**, and individual contracts.
- **Not Legal Advice**: Do not use this tool as the sole basis for legal disputes. 
- **Verification**: Always cross-check your pay with your specific company EA or the official [Fair Work Ombudsman](https://www.fairwork.gov.au/) resources.

---

## 🛠️ Project Structure

```text
src/
├── constants/
│   └── regulations.ts    <-- Adjust Super (12%), OT tiers, and standard hours here
├── utils/
│   └── calculator.ts     <-- Core logic handling Sunday minimums and OT ladders
└── ...
```

## 🚀 Getting Started

1. **Clone & Install**
   ```bash
   git clone https://github.com/crayon3shawn/payslip-checker.git
   cd payslip-checker
   npm install
   ```

2. **Run & Test**
   ```bash
   npm run dev
   npm test
   ```

## 📄 License

Licensed under **CC BY 4.0**.
