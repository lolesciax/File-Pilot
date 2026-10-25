import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
export function BlobImage({
  blob,
  alt,
  className,
}: {
  blob: Blob;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img src={url} alt={alt} className={className} /> : null;
}
export function PDFThumbnail({
  file,
  index,
  rotation = 0,
}: {
  file: File;
  index: number;
  rotation?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    if (wrap.current) observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let stopped = false;
    setError(false);
    void (async () => {
      try {
        const { getThumbnail } = await import("../processing/render");
        if (stopped) return;
        const blob = await getThumbnail(file, index, rotation);
        if (stopped) return;
        const bitmap = await createImageBitmap(blob);
        try {
          if (!stopped && canvas.current) {
            canvas.current.width = bitmap.width;
            canvas.current.height = bitmap.height;
            canvas.current.getContext("2d")?.drawImage(bitmap, 0, 0);
          }
        } finally {
          bitmap.close();
        }
      } catch {
        if (!stopped) setError(true);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [file, index, rotation, visible]);
  return (
    <div className="pdf-thumbnail" ref={wrap}>
      {error ? (
        <FileText aria-label="Preview unavailable" />
      ) : (
        <canvas ref={canvas} aria-label={`Preview of page ${index + 1}`} />
      )}
    </div>
  );
}
