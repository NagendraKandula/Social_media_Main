"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import styles from "../../styles/HomeCSS/Header.module.css";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

const Chatbot = dynamic(() => import("../../components/Chatbot"), {
  ssr: false,
});

const dropdownMenus = [
  {
    label: "Features",
    items: [
      { title: "AI Assistant", description: "Create and refine platform-ready content.", href: "#ai-workflow" },
      { title: "Scheduling", description: "Plan posts and publish at the right time.", href: "#planning" },
      { title: "Analytics", description: "Understand performance across every profile.", href: "#analytics" },
      { title: "Media Library", description: "Keep visual assets organized in one place.", href: "#features" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { title: "Instagram", description: "Posts, reels, and stories.", href: "#integrations" },
      { title: "Facebook", description: "Pages, feeds, reels, and stories.", href: "#integrations" },
      { title: "LinkedIn", description: "Professional posts and updates.", href: "#integrations" },
      { title: "Threads", description: "Publish conversations from SOci.", href: "#integrations" },
      { title: "YouTube", description: "Schedule video content with confidence.", href: "#integrations" },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Getting started", description: "See how SOci simplifies social publishing.", href: "#about" },
      { title: "Feature overview", description: "Explore everything available to your team.", href: "#features" },
      { title: "Planning guide", description: "Build a reliable content calendar.", href: "#planning" },
      { title: "Analytics guide", description: "Turn channel results into clear decisions.", href: "#analytics" },
    ],
  },
] as const;

export default function Header() {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const showLandingChatbot = router.pathname === "/" || router.pathname === "/Home";

  useEffect(() => {
    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };

    document.addEventListener("mousedown", closeWhenClickingOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickingOutside);
  }, []);

  const renderDropdown = (menu: (typeof dropdownMenus)[number]) => {
    const isOpen = openMenu === menu.label;
    const menuId = `home-${menu.label.toLowerCase()}-menu`;

    return (
      <div
        className={styles.navItem}
        key={menu.label}
        onMouseEnter={() => setOpenMenu(menu.label)}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <button
          type="button"
          className={styles.navTrigger}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={menuId}
          onClick={() => setOpenMenu(isOpen ? null : menu.label)}
        >
          {menu.label}
          <svg className={styles.chevron} viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1 1.5 6 6.5l5-5" />
          </svg>
        </button>

        {isOpen && (
          <div className={styles.dropdownMenu} id={menuId} role="menu">
            <span className={styles.dropdownLabel}>{menu.label}</span>
            {menu.items.map((item) => (
              <Link
                className={styles.dropdownItem}
                href={item.href}
                role="menuitem"
                key={item.title}
                onClick={() => setOpenMenu(null)}
              >
                <span className={styles.dropdownItemTitle}>{item.title}</span>
                <span className={styles.dropdownItemDescription}>{item.description}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerContainer}>

          <div className={styles.logo}>
            Socia
          </div>

          <nav
            className={styles.nav}
            ref={navRef}
            aria-label="Main navigation"
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpenMenu(null);
            }}
          >
            {renderDropdown(dropdownMenus[0])}
            {renderDropdown(dropdownMenus[1])}
            <Link href="#pricing">Pricing</Link>
            {renderDropdown(dropdownMenus[2])}
          </nav>

          <div className={styles.actions}>
            <Link href="/Auth/login" className={styles.login}>
              Log In
            </Link>
            <Link href="/Auth/register" className={styles.cta}>
              Sign Up
            </Link>
          </div>

        </div>
      </header>

      {showLandingChatbot && <Chatbot type="landing" />}
    </>
  );
}
