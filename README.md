# Monify – Quản Lý Chi Tiêu Cá Nhân

Ứng dụng web quản lý tài chính cá nhân cho nhiều người dùng trên cùng một hệ thống. Chức năng tương tự file Excel mẫu (Dashboard, Giao dịch, Ngân sách, Danh mục, Mục tiêu tiết kiệm, Công nợ, Tài khoản/Ví), bổ sung đăng nhập Google, phân quyền Admin/Member và trang quản trị.

---

## 1. Công nghệ chính

- **Frontend:** React 18, TypeScript (strict mode), Vite (SPA).
- **Styling & UI:** Tailwind CSS v3, shadcn/ui (Radix UI), Lucide Icons, Recharts.
- **State & Form:** Zustand, React Hook Form, Zod.
- **Backend & Database:** Firebase Authentication (Google Auth), Firebase Realtime Database (Rules kiểm tra phân quyền và schema).
- **Serverless API:** Vercel Serverless Functions (`api/`), Firebase Admin SDK, Jose (JWT httpOnly cookies).
- **Kiểm thử & CI/CD:** Vitest, React Testing Library, Playwright, GitHub Actions.

---

## 2. Yêu cầu môi trường

- **Node.js:** v22.x LTS
- **Package Manager:** `pnpm` (v12.x)
- **Firebase CLI:** Để chạy Firebase Emulator (Auth & RTDB)
- **Java Runtime (JRE):** Cần thiết để khởi chạy Firebase Local Emulator Suite

---

## 3. Cài đặt và chạy Local

### Bước 1: Clone repository và cài đặt dependencies

```bash
git clone <repo-url>
cd monify
pnpm install
```

### Bước 2: Chuẩn bị biến môi trường

Sao chép `.env.example` thành `.env`:

```bash
cp .env.example .env
```

### Bước 3: Chạy ứng dụng

```bash
# Khởi động Vite dev server
pnpm dev
```

Ứng dụng sẽ khả dụng tại: `http://localhost:3000`

---

## 4. Kiểm thử (Testing)

```bash
# Chạy Unit & Component tests
pnpm test

# Chạy kiểm thử có đo độ phủ code (Coverage)
pnpm test:coverage

# Chạy kiểm thử API Serverless Functions
pnpm test:api

# Chạy kiểm thử Realtime Database Rules
pnpm test:rules

# Chạy kiểm thử End-to-End (Playwright)
pnpm test:e2e
```

---

## 5. Quy chuẩn & Cấu trúc thư mục

Xem chi tiết trong:
- [PROJECT.md](file:///d:/Projects-React/monify/PROJECT.md): Đặc tả kiến trúc, mô hình dữ liệu và các module nghiệp vụ.
- [WORKFLOW.md](file:///d:/Projects-React/monify/WORKFLOW.md): Lộ trình từng giai đoạn, quy ước đặt tên và DoD.
- [TESTING_CICD.md](file:///d:/Projects-React/monify/TESTING_CICD.md): Chiến lược kiểm thử tự động và đường ống CI/CD.
- [docs/DECISIONS.md](file:///d:/Projects-React/monify/docs/DECISIONS.md): Nhật ký các quyết định kỹ thuật (ADR).

