import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  ArrowRight,
  FolderOpen,
  Grid2X2,
  Search,
  ShieldCheck,
  ArrowUpRight,
  X,
} from "lucide-react";
import { tools } from "../lib/catalog";
import { ToolIcon } from "../components/ToolIcon";
import { Button } from "../components/ui/button";
import { DocumentArt } from "../components/DocumentArt";
export default function Home() {
  const { category } = useParams();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [search, setSearch] = useState("");
  const active = category ?? "all";
  const filtered = tools.filter(
    (t) =>
      (active === "all" || t.category === active) &&
      `${t.title} ${t.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="container">
      {isHome ? (
        <>
          <section className="hero">
            <div className="hero-copy">
              <h1>
                Your files. Your tools.
                <br />
                <span>Your workspace.</span>
              </h1>
              <p>
                Process PDFs, edit images, and manage files directly in your
                browser. No uploads. No accounts. Just get things done.
              </p>
              <div className="hero-actions">
                <Button asChild>
                  <a href="#tools">
                    <Grid2X2 size={18} />
                    Explore tools
                    <ArrowRight size={18} />
                  </a>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/workspace">
                    <FolderOpen size={19} />
                    Open workspace
                  </Link>
                </Button>
              </div>
            </div>
            <DocumentArt />
          </section>
          <div className="privacy-divider">
            <span />
            <p>
              <ShieldCheck size={23} />
              Your files never leave your device.
            </p>
            <span />
          </div>
        </>
      ) : (
        <div className="page-intro">
          <Link to="/" className="back-link">
            Home / Tools
          </Link>
          <h1>
            {active === "all"
              ? "A tool for every task."
              : active === "pdf"
                ? "Make light work of PDFs."
                : active === "image"
                  ? "Give your images a little attention."
                  : "Big batches. Small effort."}
          </h1>
          <p>Simple, useful tools. All running privately in your browser.</p>
        </div>
      )}
      <section id="tools" className="catalog">
        <div className="catalog-heading">
          <div>
            <h2>
              {isHome ? "A little less busywork." : "Find your next tool"}
            </h2>
            <p>Everyday file tasks, made refreshingly simple.</p>
          </div>
          <div className="search">
            <Search size={19} />
            <input
              type="search"
              aria-label="Search tools"
              placeholder="What would you like to do?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="icon-button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
            <kbd>/</kbd>
          </div>
        </div>
        <div
          className="catalog-tabs"
          role="navigation"
          aria-label="Filter tools"
        >
          {[
            ["all", "All tools"],
            ["pdf", "PDF tools"],
            ["image", "Image tools"],
            ["batch", "Batch tools"],
          ].map(([id, label]) => (
            <Link
              key={id}
              className={active === id ? "active" : ""}
              to={id === "all" ? (isHome ? "/" : "/tools") : `/tools/${id}`}
            >
              {label}
              {id === "all" && <span>{tools.length}</span>}
            </Link>
          ))}
        </div>
        <div className="tool-grid">
          {filtered.map((tool, i) => (
            <Link
              className={`tool-card ${tool.category} card-tone-${tool.icon}`}
              to={`/tool/${tool.id}`}
              key={tool.id}
              style={{ animationDelay: `${Math.min(i, 7) * 25}ms` }}
            >
              <div className="tool-card-top">
                <span className={`tool-icon tone-${tool.icon}`}>
                  <ToolIcon name={tool.icon} />
                </span>
                <ArrowUpRight size={18} className="card-arrow" />
              </div>
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
              <span className="tool-category">
                {tool.category === "pdf"
                  ? "PDF TOOL"
                  : tool.category === "image"
                    ? "IMAGE TOOL"
                    : "BATCH TOOL"}
              </span>
            </Link>
          ))}
        </div>
        {!filtered.length && (
          <div className="empty-state">
            <Search />
            <h3>No matching tools</h3>
            <p>Try “resize”, “PDF”, or “rename”.</p>
            <Button variant="outline" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        )}
      </section>
      <section className="local-note">
        <ShieldCheck size={30} />
        <div>
          <h3>Your work stays yours.</h3>
          <p>
            Files are processed on your device and cleared when you close this
            tab. No accounts, servers, or cloud storage required.
          </p>
        </div>
        <span>
          Private by design
          <ArrowRight size={16} />
        </span>
      </section>
    </div>
  );
}
