import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { baseUrl } from "../helper/baseUrl";
import Swal from "sweetalert2";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState();
  const [secretMessage, setSecretMessage] = useState();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const { isLoggedIn } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Check if any of the fields are empty
    if (
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !gender.trim() ||
      !secretMessage.trim() ||
      age == null
    ) {
      setError("All fields are required");
      return;
    }

    if (gender.toLowerCase() !== "male" && gender.toLowerCase() !== "female") {
      setError(`Invalid gender ${gender}`);
      return;
    }
    if (age < 18) {
      setError(`You must be at least 18 years old`);
      return;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      setError("Email is not valid");
      return;
    }

    await axios
      .post(`${baseUrl}/register`, {
        username,
        email,
        password,
        gender,
        age,
        secretMessage,
      })
      .then((res) => {
        if (res.data.message === "User already exists") {
          setError(res.data.message);
        } else {
          const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.onmouseenter = Swal.stopTimer;
              toast.onmouseleave = Swal.resumeTimer;
            },
          });
          Toast.fire({
            icon: "success",
            title: "Signed in successfully",
          });
          navigate("/login");
        }
      });
  };

  return (
    <div className="flex items-center justify-center flex-col min-h-screen bg-gray-200 p-9 overflow-hidden">
      <h1 className="text-3xl font-bold text-teal-700 mb-8">Register</h1>
      <form
        className="flex flex-col gap-5 bg-white p-6 w-full max-w-md rounded-lg shadow-md"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          name="username"
          placeholder="Enter your name"
          className="border-b border-gray-300 p-3 placeholder-gray-500 outline-none w-full"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="text"
          name="gender"
          placeholder="Enter your gender"
          className="border-b border-gray-300 p-3 placeholder-gray-500 outline-none w-full"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        />
        <input
          type="number"
          name="age"
          placeholder="Enter your age"
          className="border-b border-gray-300 p-3 placeholder-gray-500 outline-none w-full"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          className="border-b border-gray-300 p-3 placeholder-gray-500 outline-none w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          name="password"
          placeholder="Enter your password"
          className="border-b border-gray-300 p-3 placeholder-gray-500 outline-none w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="text"
          name="secretMessage"
          placeholder="Enter your secret code"
          className="border-b border-gray-300 p-3 placeholder-gray-500 outline-none w-full"
          value={secretMessage}
          onChange={(e) => setSecretMessage(e.target.value)}
        />
        <p className="text-sm font-semibold text-justify">
          Always remember your secret code. It will help you to reset your
          password!!!
        </p>
        {error && (
          <p className="text-red-700 font-semibold text-center">{error}</p>
        )}
        <button
          type="submit"
          className="bg-teal-700 font-bold text-white p-3 rounded transition-transform transform hover:scale-105"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default Register;
