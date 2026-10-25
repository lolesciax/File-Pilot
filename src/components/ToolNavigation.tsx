import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import {
  conversionGroups,
  navigationTool,
  toolGroups,
} from "../lib/navigation";
import type { ToolId } from "../types";
import { ToolIcon } from "./ToolIcon";

function NavigationItem({
  id,
  onNavigate,
}: {
  id: ToolId;
  onNavigate: () => void;
}) {
  const tool = navigationTool(id);
  return (
    <NavLink to={`/tool/${id}`} className="mega-tool-link" onClick={onNavigate}>
      <span className={`mega-icon tone-${tool.icon}`}>
        <ToolIcon name={tool.icon} size={19} />
      </span>
      <span>{tool.title}</span>
    </NavLink>
  );
}
export function ToolNavigation() {
  const [open, setOpen] = useState<"convert" | "all" | null>(null);
  const root = useRef<HTMLElement>(null),
    convertButton = useRef<HTMLButtonElement>(null),
    allButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    focusFirst = useRef(false);
  const { pathname } = useLocation();
  const hoverOpened = useRef<"convert" | "all" | null>(null);
  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }
  function close() {
    hoverOpened.current = null;
    clearTimer();
    setOpen(null);
  }
  function reveal(menu: "convert" | "all") {
    clearTimer();
    setOpen(menu);
  }
  useEffect(() => {
    setOpen(null);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    if (focusFirst.current) {
      root.current?.querySelector<HTMLAnchorElement>(".mega-panel a")?.focus();
      focusFirst.current = false;
    }
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(null);
        (open === "convert" ? convertButton : allButton).current?.focus();
      }
    }
    function resize() {
      if (innerWidth <= 800) setOpen(null);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  useEffect(() => () => clearTimer(), []);
  const groups = open === "convert" ? conversionGroups : toolGroups;
  return (
    <nav
      className="desktop-nav tool-navigation"
      aria-label="Main navigation"
      ref={root}
      onPointerEnter={clearTimer}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          clearTimer();
          timer.current = setTimeout(() => setOpen(null), 180);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          close();
      }}
    >
      <NavLink
        className="nav-direct"
        to="/"
        end
        onPointerEnter={close}
        onFocus={close}
      >
        Home
      </NavLink>
      <NavLink
        className="nav-direct"
        to="/tool/merge-pdf"
        onPointerEnter={close}
        onFocus={close}
      >
        Merge PDF
      </NavLink>
      <NavLink
        className="nav-direct"
        to="/tool/split-pdf"
        onPointerEnter={close}
        onFocus={close}
      >
        Split PDF
      </NavLink>
      {(["convert", "all"] as const).map((menu) => (
        <button
          key={menu}
          ref={menu === "convert" ? convertButton : allButton}
          className={`nav-disclosure ${open === menu ? "is-open" : ""}`}
          aria-expanded={open === menu}
          aria-controls={`navigation-${menu}`}
          onClick={() => {
            if (hoverOpened.current === menu) {
              hoverOpened.current = null;
              reveal(menu);
            } else if (open === menu) close();
            else reveal(menu);
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") {
              if (open !== menu) hoverOpened.current = menu;
              reveal(menu);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              focusFirst.current = true;
              if (open === menu) {
                root.current
                  ?.querySelector<HTMLAnchorElement>(".mega-panel a")
                  ?.focus();
                focusFirst.current = false;
              } else reveal(menu);
            }
          }}
        >
          {menu === "convert" ? "Convert" : "All tools"}
          <ChevronDown size={15} />
        </button>
      ))}
      {open && (
        <div
          className={`mega-panel mega-${open}`}
          id={`navigation-${open}`}
          aria-label={
            open === "convert" ? "File converters" : "All FilePilot tools"
          }
        >
          <div className="mega-columns">
            {groups.map((group) => (
              <section className="mega-group" key={group.title}>
                <h2>{group.title}</h2>
                <div>
                  {group.ids.map((id) => (
                    <NavigationItem key={id} id={id} onNavigate={close} />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="mega-footer">
            {open === "convert" ? (
              <>
                <Link
                  to="/tool/convert-images"
                  onClick={close}
                  className="mega-format-link"
                >
                  <span className="mega-icon tone-convert">
                    <ToolIcon name="convert" size={19} />
                  </span>
                  <span>
                    Convert image formats<small>JPEG, PNG & WebP</small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
                <p>Files stay on your device.</p>
              </>
            ) : (
              <>
                <p>A tool for every task. All on your device.</p>
                <Link to="/tools" onClick={close}>
                  Explore all tools
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
