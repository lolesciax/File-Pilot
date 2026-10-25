import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Shell } from "./components/Shell";
import Home from "./features/Home";
import Settings from "./features/Settings";
import "@fontsource-variable/inter";
import "./styles.css";
const Tool = lazy(() => import("./features/Tool"));
const Workspace = lazy(() => import("./features/Workspace"));
const Privacy = lazy(() => import("./features/Privacy"));
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="container empty-state">
        <h1>Something went wrong.</h1>
        <p>
          Reload the app to start a new session. Unsaved results will be
          cleared.
        </p>
        <button
          className="button button-primary"
          onClick={() => location.reload()}
        >
          Reload FilePilot
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function RouteEffects() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
    const main = document.getElementById("main");
    main?.focus({ preventScroll: true });
    document.title = `FilePilot — ${pathname === "/privacy" ? "Privacy notice" : pathname.includes("/tool/") ? "File workspace" : "Your files. Your workspace."}`;
  }, [pathname]);
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLSelectElement)
      ) {
        const search =
          document.querySelector<HTMLInputElement>("input[type=search]");
        if (search) {
          event.preventDefault();
          search.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return null;
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <RouteEffects />
        <Suspense
          fallback={
            <div className="container empty-state" role="status">
              Opening your workspace…
            </div>
          }
        >
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Home />} />
              <Route path="tools" element={<Home />} />
              <Route path="tools/:category" element={<Home />} />
              <Route path="tool/:id" element={<Tool />} />
              <Route path="workspace" element={<Workspace />} />
              <Route path="settings" element={<Settings />} />
              <Route path="privacy" element={<Privacy />} />
              <Route
                path="*"
                element={
                  <div className="container empty-state">
                    <h1>Page not found</h1>
                    <Link to="/">Back to FilePilot</Link>
                  </div>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
