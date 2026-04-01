import { useState } from "react";

type Message = {
  sender: "user" | "bot";
  text: string;
};

const chatbotData = {
  "pre-login": [
    {
      q: "About Tool/App",
      a: "Our tool is a powerful social media management platform that helps you connect your social accounts and streamline your content creation process. You can link your YouTube account to upload videos directly. It also features an interactive 3D globe on the homepage."
    },
    {
      q: "Guidance for Signin/Login",
      a: "To get started, click Register and fill your details. If you already have an account, click Login and enter credentials. You can also sign in using Google or YouTube."
    },
    {
      q: "Delete Account",
      a: "Currently, account deletion is not available in the UI. Please contact support for assistance."
    },
    {
      q: "Premium Subscription Details",
      a: "The application is completely free for now. All features are available to all users."
    },
    {
      q: "Recover Password",
      a: "Click Forgot Password → Enter email → Receive OTP → Reset your password."
    },
    {
      q: "Security Guidelines",
      a: "Use strong passwords, do not share credentials, and always logout from shared devices."
    }
  ],

  "post-login": [
    {
      q: "How to post content",
      a: `Steps:
• Go to Create Post
• Select channels
• Upload media
• Add captions, hashtags, links
• Click Publish or Schedule`
    },
    {
      q: "How scheduling works",
      a: `Scheduling:
• Select date & time
• Auto-publish enabled
• Edit or cancel anytime`
    },
    {
      q: "How AI content generation works",
      a: `AI helps with:
• Hashtag generation
• Caption suggestions
• Content variations
• Editable outputs`
    },
    {
      q: "How to connect social media channels",
      a: `Steps:
• Go to Settings → Social Channels
• Click Connect
• Select platform
• Login and grant permissions`
    },
    {
      q: "How many accounts can be connected",
      a: "Multiple accounts can be connected depending on platform limits."
    },
    {
      q: "Current security limits",
      a: "Security limits depend on API policies."
    },
    {
      q: "How many posts per day",
      a: "Multiple posts per day are supported depending on platform limits."
    },
    {
      q: "How to disconnect an account",
      a: "Go to Social Channels → Select account → Click Disconnect."
    }
  ]
};

export default function Chatbot({ type }: { type: "pre-login" | "post-login" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hi! How can I help you today?" }
  ]);
  const [userInput, setUserInput] = useState("");

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { sender: "user", text };

    const found = chatbotData[type].find(item =>
      item.q.toLowerCase().includes(text.toLowerCase()) ||
      item.a.toLowerCase().includes(text.toLowerCase())
    );

    const botReply: Message = {
      sender: "bot",
      text: found
        ? found.a
        : "Sorry, I couldn't understand. Try another question."
    };

    setMessages(prev => [...prev, userMessage, botReply]);
    setUserInput("");
  };

  return (
    <>
      {/* Chat Icon */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "#111",
          color: "white",
          padding: "14px",
          borderRadius: "50%",
          cursor: "pointer",
          zIndex: 999999,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}
        onClick={() => setOpen(!open)}
      >
        💬
      </div>

      {/* Chat Window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            width: "340px",
            height: "460px",
            background: "#f5f5f5",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            zIndex: 999999,
            boxShadow: "0 8px 25px rgba(0,0,0,0.2)"
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px",
              background: "#111",
              color: "white",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              fontWeight: "600"
            }}
          >
            🤖 Assistant
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: "10px",
              overflowY: "auto"
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.sender === "user" ? "flex-end" : "flex-start",
                  marginBottom: "8px"
                }}
              >
                <div
                  style={{
                    background:
                      msg.sender === "user" ? "#111" : "#e4e6eb",
                    color: msg.sender === "user" ? "white" : "black",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    maxWidth: "70%",
                    fontSize: "13px",
                    whiteSpace: "pre-line"
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Questions */}
          <div style={{ padding: "6px" }}>
            {chatbotData[type].map((item, index) => (
              <button
                key={index}
                onClick={() => handleSend(item.q)}
                style={{
                  margin: "3px",
                  padding: "5px 8px",
                  fontSize: "11px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#ddd",
                  cursor: "pointer"
                }}
              >
                {item.q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div
            style={{
              display: "flex",
              padding: "8px",
              borderTop: "1px solid #ccc",
              background: "white"
            }}
          >
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend(userInput);
              }}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #ccc"
              }}
            />

            <button
              onClick={() => handleSend(userInput)}
              style={{
                marginLeft: "5px",
                padding: "8px",
                borderRadius: "8px",
                background: "#111",
                color: "white",
                border: "none",
                cursor: "pointer"
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}