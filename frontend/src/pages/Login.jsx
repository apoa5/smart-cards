import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { supabase } from "../supabaseClient";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage(""); // Clear error when typing
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      setErrorMessage("Invalid email or password. Please try again.");
      console.log(error.message);
    } else {
      console.log("Logged in:", data.user);
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-gray-900">
      {/* Logo */}
      <div className="pl-26 py-6 text-xl font-bold flex-shrink-0">SmartCards</div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md border border-gray-400">
          <h2 className="text-2xl font-bold text-center">Sign In</h2>
          <p className="text-center text-gray-500">Sign into an existing account</p>

          {/* Error Popup */}
          {errorMessage && (
            <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-3 rounded-lg mt-4">
              <XCircleIcon className="w-5 h-5" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-6">
            {/* Email */}
            <div className="relative">
              <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-lime-900 focus:outline-none"
              />
            </div>

            {/* Password with Toggle */}
            <div className="relative">
              <LockClosedIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-lime-900 focus:outline-none"
              />
              <div
                className="absolute right-3 top-2.5 text-gray-400 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-lime-900 text-white py-4 rounded-full hover:bg-lime-950 cursor-pointer transition"
            >
              Sign In
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{" "}
              <a href="/signup" className="text-lime-900 hover:underline">
                Sign Up
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
