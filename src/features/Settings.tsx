import { Moon, Sun, Monitor, ShieldCheck } from "lucide-react";
import { useTheme, type Theme } from "../lib/theme";
import { Link } from "react-router-dom";
export default function Settings() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="container settings-page">
      <div className="page-intro">
        <h1>Make yourself at home.</h1>
        <p>A few simple preferences for your workspace.</p>
      </div>
      <section className="panel">
        <h2>Appearance</h2>
        <p>Choose a theme. Your preference is saved on this device.</p>
        <div className="theme-choices">
          {(
            [
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
              ["system", "System", Monitor],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              className={theme === id ? "selected" : ""}
              aria-pressed={theme === id}
              onClick={() => setTheme(id as Theme)}
            >
              <Icon size={24} />
              {label}
            </button>
          ))}
        </div>
      </section>
      <section className="panel privacy-settings">
        <ShieldCheck size={28} />
        <div>
          <h2>Private by design</h2>
          <p>
            Your documents and images are processed locally. Files, previews,
            and outputs remain in memory until you clear the workspace or close
            this tab. Only your theme preference is saved; document contents and
            processing history are never persisted.
          </p>
          <p>
            FilePilot has no analytics, accounts, external processing APIs, or
            hosted database. Initial application assets must be downloaded
            before use.
          </p>
          <Link to="/privacy" className="privacy-external">
            Read the full privacy notice
          </Link>
        </div>
      </section>
      <section className="panel">
        <h2>About FilePilot</h2>
        <p>Version 1.0 · Universal File & Document Toolkit</p>
        <p>
          Supported formats: PDF, DOCX, XLSX, PPTX, JPEG, PNG, WebP, and ZIP
          exports. Maximum 100 MB per file, 300 MB per input batch, 100 files,
          and 2,000 PDF pages. Image processing is limited to 32 megapixels per
          output. Office input packages are limited to 20 MB, with up to 200
          pages per conversion. PDF-to-Excel extracts text; PDF-to-PowerPoint
          creates image-based slides. Office layouts and fonts may change.
        </p>
      </section>
    </div>
  );
}
