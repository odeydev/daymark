export const AUTH_STORAGE_KEY = "daymark-auth";

const demoUser = {
  id: "demo-user",
  name: "Jordan Davis",
  email: "jordan@daymark.app",
  plan: "Pro",
  avatar: "JD",
};

export const authService = {
  async login({ email, password }) {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const trimmedEmail = String(email || "").trim();
    const trimmedPassword = String(password || "").trim();

    if (!trimmedEmail || !trimmedPassword) {
      throw new Error("Email and password are required.");
    }

    const user = {
      ...demoUser,
      email: trimmedEmail,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  async signup({ fullName, email, password }) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!fullName || !email || !password) {
      throw new Error("Please complete all signup fields.");
    }

    const user = {
      ...demoUser,
      name: fullName.trim(),
      email: String(email).trim(),
      plan: "Free",
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  async logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
};
