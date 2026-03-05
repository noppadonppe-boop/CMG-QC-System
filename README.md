# CMG QC Management System

React + Vite + Firebase Firestore.

## Firebase

- ค่าตั้งต้น Firebase อยู่ใน `.env` (ไม่ commit — ดู `.env.example` สำหรับตัวแปรที่ต้องใส่)
- โครงสร้าง Firestore: **Collection** `QC-System` → **Document** `root` → **Subcollections** ตามหมวดเมนู (`projects`, `qcDocuments`, `itp`, `rfi`, `materials`, `ncr`, `punchlist`, `handover`, `finalPackage`, `users`)

### นำ Mock Data ขึ้น Firebase (Seed)

1. เปิดแอปด้วย query string `?seed=1` (เช่น `http://localhost:5173/?seed=1`)
2. กดปุ่ม **"Seed Firebase (Mock Data)"** มุมล่างขวา
3. หน้าแอปจะ reload และโหลดข้อมูลจาก Firestore

ใน Firebase Console ต้องเปิด Firestore และตั้ง Rules ให้อ่าน/เขียนได้ (เช่น ชั่วคราวใช้ `allow read, write: if true;` สำหรับพัฒนา)

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
