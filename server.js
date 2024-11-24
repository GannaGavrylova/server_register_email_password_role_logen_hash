import express from "express";
import "dotenv/config";
import cors from "cors";
import bcrypt from "bcrypt";
import isAdmin from "./middlewares/isAdmin.js";
import mustChangePassword from "./middlewares/mustChangePassword.js";

const app = express();
const port = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

const users = [
  {
    id: "1",
    name: "Bob",
    email: "bob@g.con",
    password: "root",
    mustChangePassword: false,
    role: "admin",
  },
  {
    id: "2",
    name: "Alice",
    email: "alice@g.con",
    password: "root",
    mustChangePassword: false,
    role: "user",
  },
];
// Middleware для проверки необходимости смены пароля
// const mustChangePasswordMiddlewere = (req, res, next) => {
//   const user = req.user;
//   if (user && user.mustChangePassword) {
//     return res.status(403).json({ error: "You must change your password" });
//   }

//   next();
// };
// Middleware для проверки роли администратора
// const isAdminMiddleware = (req, res, next) => {
//   if (req.user.role !== "admin") {
//     return res.status(403).json({ error: "Access denied. Admins only." });
//   }
//   next();
// };

// app.use((req, res, next) => {
//   const isAdmin = req.headers["role"]; // Предположим, что роль передаётся в заголовках
//   if (isAdmin !== "admin") {
//     return res.status(403).json({ error: "Access denied. Admins only. " });
//   }
//   next();
// });
// Маршрут для регистрации
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(404).json({ error: "All fields are required" });
    }
    //Проверка уникальности email при регистрации
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res
        .status(403)
        .json({ error: "A user with this email is arleady registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 5);
    users.push({
      id: `${users.length + 1}`, // Генерация ID
      name,
      email,
      password: hashedPassword,
      mustChangePassword: false, // Новые пользователи не должны менять пароль
      role,
    });
    res.status(200).json({ message: "User registretion!" });
  } catch (error) {
    res.status(500).json({ message: "User registration Error" });
  }
});
// Маршрут для изменения пароля
app.post("/change-password", mustChangePassword, async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    // Проверяем, что все поля заполнены

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fieleds are required" });
    }
    // Находим пользователя по userId
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Проверяем текущий пароль
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: "Incorrect current password" });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 5);
    // Обновляем пароль и сбрасываем флаг mustChangePassword

    user.password = hashedNewPassword;
    user.mustChangePassword = false;

    res.status(200).json({ message: "Password successfully changed" });
  } catch (error) {
    res.status(500).json({ error: "Failed to change password" });
  }
});
// Маршрут для назначения роли пользователю
app.put("/admin", isAdmin, (req, res) => {
  try {
    const { userId, role } = req.body; // Новая роль из тела запроса
    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }
    // Проверка допустимости новой роли
    const validRoles = ["user", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role provided." });
    }
    // Находим пользователя по ID
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Назначаем новую роль
    user.role = role;
    res
      .status(200)
      .json({ message: `Role updated successfully to ${role}`, user });
  } catch (error) {}
  res.status(500).json({ error: "Something went wrong" });
});
// Маршрут для удаления аккаунта
app.post("/delete-account", async (req, res) => {
  try {
    const { userId, currentPassword } = req.body;
    // Найти пользователя по ID
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User is not found" });
    }
    // Проверить текущий пароль
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordCorrect) {
      return res.status(404).json({ error: "Incorrect password" });
    }
    // Удалить пользователя из базы
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users.splice(index, 1); //index - Начальная позиция, с которой будет производиться удаление. 1 - Количество удаляемых элементов
    }
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Маршрут для изменения email
app.post("/change-email", async (req, res) => {
  const { userId, currentEmail, newEmail, currentPassword } = req.body;
  // Проверяем, что все поля заполнены

  if (!userId || !currentEmail || !newEmail || !currentPassword) {
    return res.status(400).json({ error: "All fieleds are required" });
  }
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User is not found" });
  }
  const isPasswordCorrect = await bcrypt.compare(
    currentPassword,
    user.password
  );
  if (!isPasswordCorrect) {
    return res.status(404).json({ error: "Incorrect password" });
  }
  const userExists = users.some((user) => user.email === newEmail);
  if (userExists) {
    return res.status(409).json({ error: "Email already exists" });
  }

  if (newEmail) user.email = newEmail;
  res.status(200).json({ message: "email successfully change" });
});

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
