import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from "../assets/navalstrike-logo.jpg";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || (!isLogin && (!email || !confirmPassword))) {
      toast.error("Captain, fields are incomplete!");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password, email); // email can be handled in backend if needed
      }
      toast.success(`Aye Aye Captain! You've ${isLogin ? "boarded" : "joined"} the fleet.`);
      navigate("/lobby");
    } catch (error) {
      toast.error("⚠️ Failed to dock! Check credentials.");
    }
  };

  // Reset fields when toggling
  const handleTab = (login) => {
    setIsLogin(login);
    setEmail("");
    setConfirmPassword("");
    setUsername("");
    setPassword("");
  };

  return (
    <div className="navy-auth-wrapper">
      <div className="navy-auth-card">
        <div className="navy-logo">
          <img src={logo} alt="Naval Strike Logo" style={{ width: 100, height: 100, borderRadius: "50%", marginBottom: 8 }} />
        </div>
        <h1 className="title">Naval Strikee</h1>
        <h2 className="subtitle2" style={{ fontWeight: 400, fontSize: 20, marginBottom: 8, color: '#4a5568' }}>Strike First, Strike Hard, No Mercy, No Retreat</h2>
        <p className="subtitle">{isLogin ? "Crew Login" : "Register as Captain"}</p>

        <div className="navy-tabs">
          <button
            className={`navy-tab ${isLogin ? "active" : ""}`}
            onClick={() => handleTab(true)}
          >
            Login
          </button>
          <button
            className={`navy-tab ${!isLogin ? "active" : ""}`}
            onClick={() => handleTab(false)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="navy-form">
          {/* Email input for register, slides from above */}
          <div className={`slide-email ${isLogin ? "hidden" : "visible"}`}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={!isLogin}
              minLength={5}
              autoComplete="email"
            />
          </div>
          <input
            type="text"
            placeholder="Call Sign"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Secret Code"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
          {/* Confirm password for register, slides from below */}
          <div className={`slide-confirm ${isLogin ? "hidden" : "visible"}`}>
            <input
              type="password"
              placeholder="Confirm Secret Code"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required={!isLogin}
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Launching Ship..." : isLogin ? "Set Sail" : "Join Fleet"}
          </button>
        </form>

        <p className="navy-footer-msg">
          <i className="fas fa-info-circle"></i> Any name/code will get you aboard, Captain.
        </p>
      </div>
      <ToastContainer position="top-center" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
