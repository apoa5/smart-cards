import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import FileUploader from "../components/FileUploader";
import { AuthContext } from "../context/AuthContext";
import { UserCircleIcon } from "@heroicons/react/24/outline";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <header className="flex justify-between px-8 py-6 max-w-7xl mx-auto">
        {/* Left: Logo */}
        <div className="text-xl font-bold flex-shrink-0">SmartCards</div>

        {/* Center: User info */}
        {user && (
          <div className="flex items-center gap-2 text-gray-700 font-medium bg-gray-200 rounded-full px-5 py-3">
            <UserCircleIcon className="w-8 h-8 text-gray-700" />
            <span>{user.user_metadata?.username || "User"}</span>
          </div>
        )}

        {/* Right: CTA Button */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="bg-lime-900 text-white text-sm px-5 py-3 rounded-full font-semibold hover:bg-lime-950 cursor-pointer transition"
        >
          Log out →
        </button>
      </header>

      <main className="text-center pt-10 px-6">
        <h1 className="text-5xl font-serif text-semibold leading-tight mb-10">
          Generate Flashcards and Quizzes
        </h1>
        <div>
          <FileUploader />
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-lg bg-black/60 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold mb-4">
              Are you sure you want to log out?
            </h3>
            <div className="flex gap-4 justify-center">
              <button
                onClick={confirmLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-800 cursor-pointer transition"
              >
                Yes
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
