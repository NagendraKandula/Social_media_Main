"use client";

import { useState, useEffect } from "react";
import { FaComments, FaPaperPlane, FaRobot, FaTimes } from "react-icons/fa";
import styles from "../styles/Chatbot.module.css";

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
      q: "How does Connect work?",
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

  useEffect(() => {
    if (type !== "post-login") return;

    const openHelp = () => setOpen(true);
    window.addEventListener("story-open-help", openHelp);
    return () => window.removeEventListener("story-open-help", openHelp);
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
      <button
        type="button"
        aria-label={open ? "Close assistant" : "Open assistant"}
        onClick={() => setOpen(!open)}
        className={`${styles.launcher} ${open ? styles.launcherOpen : ""}`}
      >
        {open ? <FaTimes size={17} /> : <FaComments size={19} />}
      </button>

      {open && (
        <section className={styles.panel} aria-label="Chat assistant">
          <div className={styles.header}>
            <div className={styles.identity}>
              <span className={styles.avatar}>
                <FaRobot size={15} />
              </span>
              <div>
                <h2 className={styles.title}>Assistant</h2>
                <p className={styles.subtitle}>Quick help for Story</p>
              </div>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <FaTimes size={13} />
            </button>
          </div>

          <div className={styles.quickActions} aria-label="Suggested questions">
            {chatbotData[type].map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(item.q)}
                className={styles.chip}
              >
                {item.q}
              </button>
            ))}
          </div>

          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.messageRow} ${
                  msg.sender === "user" ? styles.fromUser : styles.fromBot
                }`}
              >
                <div
                  className={`${styles.bubble} ${
                    msg.sender === "user" ? styles.userBubble : styles.botBubble
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.composer}>
            <input
              value={userInput}
              placeholder="Ask a question..."
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleSend(userInput)
              }
              className={styles.input}
            />
            <button
              type="button"
              onClick={() => handleSend(userInput)}
              className={styles.sendButton}
              aria-label="Send message"
            >
              <FaPaperPlane size={14} />
            </button>
          </div>
        </section>
      )}
    </>
  );
}
