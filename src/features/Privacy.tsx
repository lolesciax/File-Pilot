import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, ArrowUpRight } from "lucide-react";
import notice from "../content/privacy.json";

export default function Privacy() {
  return (
    <article className="container privacy-page">
      <div className="page-intro">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          Back to FilePilot
        </Link>
        <h1>{notice.title}</h1>
        <p>
          Last updated{" "}
          <time dateTime={notice.updatedISO}>{notice.updated}</time>
        </p>
      </div>
      <div className="privacy-summary">
        <ShieldCheck size={26} />
        <p>{notice.summary}</p>
      </div>
      <nav aria-label="Privacy notice contents" className="privacy-contents">
        {notice.sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>
      {notice.sections.map((section, index) => (
        <section key={section.id} id={section.id} className="privacy-section">
          <h2>
            {index + 1}. {section.title}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.links?.map((link) => (
            <a
              className="privacy-external"
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
              <ArrowUpRight size={16} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </section>
      ))}
      <div className="privacy-actions">
        <Link to="/settings">Manage appearance in Settings</Link>
        <Link to="/workspace">Open your workspace</Link>
      </div>
    </article>
  );
}
