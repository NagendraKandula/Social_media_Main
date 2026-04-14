"use client";

import { useState, useEffect } from "react";

type Message = {
  sender: "user" | "bot";
  text: string;
};

const chatbotData = {
  landing: [
    {
      q: "About Tool",
      a: `📌 About the Platform:
• Manage all your social media accounts in one place
• Create and publish content easily
• Track performance efficiently`
    },
    {
      q: "Features",
      a: `✨ Key Features:
• Schedule posts
• Weekly analytics
• AI-generated captions
• AI content creation`
    },
    {
      q: "Quick Tour",
      a: `🚀 How it works:
• Sign up with your credentials
• Connect your social media accounts
• Create and publish content
• Analyze performance`
    },
    {
      q: "Get Started",
      a: `👉 Get Started:
• Click on "Sign Up"
• Create your account
• Start managing your content`
    }
  ],

  "pre-login": [
    {
      q: "Login Help",
      a: `🔐 Login Process:
• Click on "Register" if you are a new user
• Fill in your details
• Log in using your credentials`
    },
    {
      q: "Forgot Password",
      a: `🔑 Reset Password:
• Click on "Forgot Password"
• Enter your registered email
• Reset your password using OTP`
    },
    {
      q: "Security Guidelines",
      a: `🛡️ Stay Secure:
• Use a strong password
• Avoid sharing credentials
• Always log out on shared devices`
    },
    {
      q: "Features",
      a: `✨ Platform Features:
• Post scheduling
• Weekly analytics
• AI captions
• AI content creation`
    },
    {
      q: "Quick Tour",
      a: `🚀 How it Works:
• Sign up with your credentials
• Connect social media accounts
• Create and publish posts
• Track analytics`
    }
  ],

  "post-login": [
    {
  q: "How to create post",
  a: `📝 Create a Post:
• Go to the "Create" section
• Choose a template or start from scratch
• Upload your image or content
• Add elements like shapes, frames, and designs
• Edit your text using text tools
• Customize font size, style, and formatting from properties
• Download or publish your final post`
},
    {
      q: "How do Active Platforms work?",
      a: `🔗 sers can select social media platforms such as Facebook, Instagram, YouTube, Threads, X (Twitter), and LinkedIn.

• Click on the "Connect" button for the platform you want to link.
• You will be redirected to the respective platform’s login page.
• Sign in using your credentials and grant necessary permissions.
• Once connected, the platform will be integrated with the tool for posting and management.`},
    {
  q: "How to Schedule a Post",
  a: `⏰ Schedule a Post:
• Go to the "Schedule" section
• Select the social media channels
• Write your post content
• Add images or media if needed
• Choose the date and time for posting
• Click on "Schedule" to automate publishing
• Your post will be published automatically at the selected time`
},{
  q: "AI Assistant",
  a: `🤖 AI Assistant:
• Go to the "Publish" or "Schedule" section
• Enter a topic or idea for your post
• Use AI tools to generate:
  - Captions
  - Hashtags
  - Content ideas
  - Descriptions
• Edit the generated content if needed
• Use it directly in your post to save time and improve quality`
},
  {
  q: "How to use templates",
  a: `🎨 Using Templates:
• Go to the "Templates" section
• Browse available templates for different platforms
• Click on the template you want to use
• Customize it by adding your content and media
• Edit text, colors, and design elements
• Use it to create your post easily`
},{
  q: "How to publish post",
  a: `🚀 Publish a Post:
• Go to the "Publish" section
• Select the social media channels
• Write or paste your content
• Add images or media if needed
• Use AI Assistant for captions, hashtags, or content
• Click on "Publish" to post instantly
• Or choose "Schedule" to post later`
},
    {
      q: "Connect Accounts",
      a: `🔗 Connect Accounts:
• Go to Settings
• Select Social Channels
• Connect your account`
    }

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

  const storageKey =
    type === "landing"
      ? "chat_landing"
      : type === "pre-login"
      ? "chat_login"
      : "chat_postlogin";

  const getWelcomeMessage = () => {
    if (type === "landing") return "👋 Welcome! I’ll guide you 🚀";
    if (type === "pre-login") return "Hi! Need help logging in?";
    return "Hi! Need help using the tool?";
  };

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([{ sender: "bot", text: getWelcomeMessage() }]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

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

          {/* QUESTIONS */}
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
                    maxWidth: "75%",

                    // IMPORTANT FIX
                    whiteSpace: "pre-line",
                    lineHeight: "1.8",
                    fontSize: "13px"
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