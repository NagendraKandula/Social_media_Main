"use client";

import { useState, useEffect } from "react";

type Message = {
  sender: "user" | "bot";
  text: string;
};

const chatbotData = {
  landing: [
    { q: "About Tool", a: "Manage all social media in one place." },
    { q: "Features", a: "Scheduling Posts, Weekly Analytics, AI captions, AI content creation" },
    { q: "Quick Tour", a: "Signup with your credentials → Connect with your social media accounts → Post your content → Analyze" },
    { q: "Get Started", a: "Click Sign Up to begin!" }
  ],

  "pre-login": [
    {
    q: "Login Help",
    a: `Login Process:
1. Click on "Register" if you are a new user
2. Fill in your details
3. Log in using your credentials`
  },
    {
    q: "Forgot Password",
    a: `Reset Password:
1. Click on "Forgot Password"
2. Enter your registered email
3. Reset your password using OTP`
  },
{
    q: "Security Guidelines",
    a: `Stay Secure:
• Use a strong password
• Avoid sharing your credentials
• Always log out on shared devices`
  },
  {
    q: "About Tool",
    a: "This platform helps you manage and control all your social media accounts in one place efficiently."
  },
  {
    q: "Features",
    a: `✨ Key Features:
• Post scheduling
• Weekly analytics
• AI-generated captions
• AI content creation`
  },
  {
    q: "Quick Tour",
    a: `🚀 How it works:
1. Sign up with your credentials
2. Connect your social media accounts
3. Create and publish your content
4. Track performance using analytics`
  },
    { q: "Get Started",
    a: "Click on 'Sign Up' to begin using the platform and start managing your content."}
  ],

  "post-login": [
    { q: "How to post", a: "Go to Create Post → Upload your content → Publish." },
    { q: "Scheduling", a: "Click on Scheduling → Select date & time to schedule your post → Auto publish in your social media account as per your schedule" },
    { q: "Connect Accounts", a: "Go to Settings → Select Social Channels → and then Connect your account" }
  ]
};

export default function Chatbot({
  type
}: {
  type: "landing" | "pre-login" | "post-login";
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");

  // DIFFERENT STORAGE FOR EACH BOT
  const storageKey =
    type === "landing"
      ? "chat_landing"
      : type === "pre-login"
      ? "chat_login"
      : "chat_postlogin";

  // Welcome message
  const getWelcomeMessage = () => {
    if (type === "landing") return "👋 Welcome! I’ll guide you 🚀";
    if (type === "pre-login") return "Hi! Need help logging in?";
    return "Hi! Need help using the tool?";
  };

  // Load messages
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([{ sender: "bot", text: getWelcomeMessage() }]);
    }
  }, [storageKey]);

  // Save messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  // Auto open only landing
  useEffect(() => {
    if (type === "landing") {
      setTimeout(() => setOpen(true), 3000);
    }
  }, [type]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { sender: "user", text };

    const found = chatbotData[type].find(item =>
      item.q.toLowerCase().includes(text.toLowerCase())
    );

    const botReply: Message = {
      sender: "bot",
      text: found ? found.a : "Sorry, I didn't understand."
    };

    // NEW MESSAGE AT TOP
    setMessages(prev => [botReply, userMessage, ...prev]);

    setUserInput("");
  };

  return (
    <>
      {/* ICON */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "linear-gradient(45deg, #7b2ff7, #f107a3)",
          color: "white",
          padding: "14px",
          borderRadius: "50%",
          cursor: "pointer",
          zIndex: 9999
        }}
      >
        💬
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            width: "340px",
            height: "460px",
            background: "white",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
          }}
        >
          {/* HEADER */}
          <div style={{ padding: "12px", background: "#7b2ff7", color: "white" }}>
            🤖 Assistant
          </div>

          {/*  QUESTIONS AT TOP */}
          <div style={{ padding: "6px", borderBottom: "1px solid #eee" }}>
            {chatbotData[type].map((item, i) => (
              <button
                key={i}
                onClick={() => handleSend(item.q)}
                style={{
                  margin: "3px",
                  padding: "5px 8px",
                  fontSize: "11px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#f0f0f0",
                  cursor: "pointer"
                }}
              >
                {item.q}
              </button>
            ))}
          </div>

          {/* MESSAGES */}
          <div
            style={{
              flex: 1,
              padding: "10px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column-reverse"
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.sender === "user" ? "flex-end" : "flex-start",
                  marginBottom: "10px"
                }}
              >
                <div
                  style={{
                    background:
                      msg.sender === "user"
                        ? "linear-gradient(45deg, #7b2ff7, #f107a3)"
                        : "#e4e6eb",
                    color: msg.sender === "user" ? "white" : "black",
                    padding: "10px",
                    borderRadius: "16px",
                    maxWidth: "75%"
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* INPUT */}
          <div style={{ display: "flex", padding: "8px" }}>
            <input
  value={userInput}
  placeholder="Type a message..."   
  onChange={(e) => setUserInput(e.target.value)}
  onKeyDown={(e) =>
    e.key === "Enter" && handleSend(userInput)
  }
  style={{ flex: 1, padding: "8px" }}
/>
            <button onClick={() => handleSend(userInput)}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}