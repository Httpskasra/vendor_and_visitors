const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

const users = [
  {
    id: 1,
    name: "علی رضایی",
    email: "ali@example.com",
    phone: "09121234567",
    role: "توسعه‌دهنده فرانت‌اند",
    department: "فنی",
    city: "تهران",
    status: "active",
  },
  {
    id: 2,
    name: "سارا محمدی",
    email: "sara@example.com",
    phone: "09123334455",
    role: "طراح رابط کاربری",
    department: "طراحی",
    city: "شیراز",
    status: "active",
  },
  {
    id: 3,
    name: "رضا احمدی",
    email: "reza@example.com",
    phone: "09351234567",
    role: "کارشناس فروش",
    department: "فروش",
    city: "تبریز",
    status: "inactive",
  },
  {
    id: 4,
    name: "مریم حسینی",
    email: "maryam@example.com",
    phone: "09115556677",
    role: "کارشناس منابع انسانی",
    department: "منابع انسانی",
    city: "اصفهان",
    status: "active",
  },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get("/api/users", async (req, res) => {
  await delay(700);

  res.json({
    success: true,
    data: users,
  });
});

app.get("/api/users/:id", async (req, res) => {
  await delay(500);

  const userId = Number(req.params.id);
  const user = users.find((item) => item.id === userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "کاربر پیدا نشد.",
    });
  }

  return res.json({
    success: true,
    data: user,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "آدرس موردنظر پیدا نشد.",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});