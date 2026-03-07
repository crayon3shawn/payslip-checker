# 🇦🇺 AU Payslip Checker

A minimalist, privacy-first tool to verify Australian payslips based on 2025 Fair Work standards.

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

---

<img width="100%" alt="AU Payslip Checker Preview" src="https://github.com/user-attachments/assets/45cba4d5-e82e-44df-ac43-57322f1de7f1" />

## 🛠️ Project Structure

The project is architected for maintainability and easy updates to labor laws:

```text
src/
├── constants/
│   └── regulations.ts    <-- Change Super rate or OT limits here
├── hooks/
│   └── usePayslip.ts     <-- Custom state & LocalStorage logic
├── locales/
│   ├── en.ts             <-- English translations
│   └── tw.ts             <-- Traditional Chinese translations
├── utils/
│   └── calculator.ts     <-- The core calculation engine (Tested)
└── App.tsx               <-- Clean UI Rendering
```

## 🚀 Getting Started

1. **Clone & Install**
   ```bash
   git clone https://github.com/crayon3shawn/payslip-checker.git
   cd payslip-checker
   npm install
   ```

2. **Run Dev Server**
   ```bash
   npm run dev
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

## 📄 License

Licensed under **CC BY 4.0**. Free to use and share with attribution.
