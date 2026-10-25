import { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  FolderOpen,
  Moon,
  Sun,
  Settings,
  Menu,
  X,
  ShieldCheck,
  Send,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTheme } from "../lib/theme";
import { Button } from "./ui/button";
import { ToolNavigation } from "./ToolNavigation";
import { toolGroups, navigationTool } from "../lib/navigation";
import { ToolIcon } from "./ToolIcon";
const nav = [
  ["/tools", "All tools"],
  ["/tools/pdf", "PDF tools"],
  ["/tools/image", "Image tools"],
  ["/tools/batch", "Batch tools"],
];
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="FilePilot home">
      <Send size={30} fill="currentColor" strokeWidth={1.4} />
      <span>
        FilePilot<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function Shell() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header-inner">
          <Brand />
          <ToolNavigation />
          <div className="header-actions">
            <button
              className="icon-button theme-toggle"
              aria-label="Toggle color theme"
              onClick={() =>
                setTheme(
                  document.documentElement.dataset.theme === "dark"
                    ? "light"
                    : "dark",
                )
              }
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Button asChild className="workspace-link">
              <Link to="/workspace">
                <FolderOpen size={18} />
                Open workspace
              </Link>
            </Button>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button
                  className="icon-button mobile-menu"
                  aria-label="Open navigation"
                >
                  <Menu />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content mobile-drawer">
                  <div className="drawer-heading">
                    <Dialog.Title>FilePilot navigation</Dialog.Title>
                    <Dialog.Close
                      className="icon-button"
                      aria-label="Close navigation"
                    >
                      <X />
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">
                    Browse tools and settings.
                  </Dialog.Description>
                  <nav>
                    {[
                      ["/", "Home"],
                      ...nav,
                      ["/workspace", "Workspace"],
                      ["/settings", "Settings"],
                      ["/privacy", "Privacy notice"],
                    ].map(([to, label]) => (
                      <Dialog.Close asChild key={to}>
                        <Link to={to}>{label}</Link>
                      </Dialog.Close>
                    ))}
                  </nav>
                  <div className="mobile-tool-groups">
                    {toolGroups.map((group) => (
                      <section key={group.title}>
                        <h3>{group.title}</h3>
                        {group.ids.map((id) => {
                          const tool = navigationTool(id);
                          return (
                            <Dialog.Close asChild key={id}>
                              <Link
                                to={`/tool/${id}`}
                                className="mobile-tool-link"
                              >
                                <span className={`mega-icon tone-${tool.icon}`}>
                                  <ToolIcon name={tool.icon} size={18} />
                                </span>
                                {tool.title}
                              </Link>
                            </Dialog.Close>
                          );
                        })}
                      </section>
                    ))}
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <Brand />
        <span className="footer-privacy">
          <ShieldCheck size={16} />
          Local processing. Your files stay on your device.
        </span>
        <div className="formats">PDF · DOCX · XLSX · PPTX · Images · ZIP</div>
        <Link to="/privacy" className="privacy-link">
          Privacy
        </Link>
        <Link to="/settings" className="settings-link" aria-label="Settings">
          <Settings size={16} /> <span>Settings</span>
        </Link>
        <span className="version">v1.0</span>
      </footer>
    </>
  );
}
