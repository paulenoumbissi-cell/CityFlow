export const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const token = "jwt_cityflow_demo_token_" + Date.now();
  res.json({
    success: true,
    token,
    user: {
      id: "usr_001",
      name: email.split("@")[0] || "Paule Noumbissi",
      email,
      city: "Yaoundé",
      role: "user",
      token,
    },
  });
};

export const register = (req, res) => {
  const { name, email, password, city = "Yaoundé" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  const token = "jwt_cityflow_demo_token_" + Date.now();
  res.status(201).json({
    success: true,
    token,
    user: {
      id: "usr_" + Math.floor(Math.random() * 1000),
      name,
      email,
      city,
      role: "user",
      token,
    },
  });
};
