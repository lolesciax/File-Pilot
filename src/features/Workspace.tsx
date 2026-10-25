import { Link } from "react-router-dom";
import { FolderOpen, ArrowRight, Trash2, ShieldCheck } from "lucide-react";
import { useWorkspace } from "../stores/workspace";
import { formatSize } from "../lib/files";
import { tools } from "../lib/catalog";
import { Results } from "../components/Results";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/dialog";
export default function Workspace() {
  const s = useWorkspace();
  return (
    <div className="container workspace-page">
      <div className="page-intro">
        <h1>Your workspace.</h1>
        <p>
          A little room for the task at hand. Everything here stays in this
          browser session.
        </p>
      </div>
      <Results />
      {s.files.length > 0 ? (
        <section className="panel">
          <div className="section-heading">
            <h2>Selected files · {s.files.length}</h2>
            <Button asChild variant="outline">
              <Link to={`/tool/${s.tool}`}>
                Continue {tools.find((t) => t.id === s.tool)?.title}
                <ArrowRight size={17} />
              </Link>
            </Button>
          </div>
          {s.files.map((f) => (
            <div className="result-row" key={f.id}>
              <FolderOpen size={22} />
              <div className="file-meta">
                <strong>{f.file.name}</strong>
                <span>{formatSize(f.file.size)}</span>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="empty-state panel">
          <FolderOpen size={44} />
          <h2>A clear space. A fresh start.</h2>
          <p>Choose a tool to add files and make something useful.</p>
          <Button asChild>
            <Link to="/tools">
              Explore tools
              <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      )}
      <div className="workspace-bottom">
        <p>
          <ShieldCheck size={16} />
          Files are never permanently saved. Refreshing or closing this tab
          clears the session.
        </p>
        <ConfirmDialog
          title="Clear your workspace?"
          description="This removes selected files and results from memory. Download your outputs first."
          onConfirm={s.clear}
          trigger={
            <Button variant="outline">
              <Trash2 size={17} />
              Clear workspace
            </Button>
          }
        />
      </div>
    </div>
  );
}
