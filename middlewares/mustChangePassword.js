export default (req, res, next) => {
  const user = req.user;
  if (user && user.mustChangePassword) {
    return res.status(403).json({ error: "You must change your password" });
  }

  next();
};
