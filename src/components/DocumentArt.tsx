import { FileArchive, Image } from "lucide-react";
import { useElementSize } from "../hooks/useElementSize";
export function DocumentArt() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  return (
    <div className="document-art" ref={ref} aria-hidden="true">
      <div
        className="document-art-scene"
        style={{ transform: `scale(${Math.min(1, size.width / 450)})` }}
      >
        <div
          className="art-sheet art-zip"
          data-home-fade
          data-home-reveal
          data-home-delay="300"
          data-home-duration="780"
          data-home-distance="28"
        >
          <FileArchive size={63} />
          <div className="art-lines">
            <i />
            <i />
          </div>
        </div>
        <div
          className="art-sheet art-image"
          data-home-fade
          data-home-reveal
          data-home-delay="220"
          data-home-duration="740"
          data-home-distance="24"
        >
          <Image size={85} />
          <div className="art-lines">
            <i />
            <i />
          </div>
        </div>
        <div
          className="art-sheet art-pdf"
          data-home-reveal
          data-home-delay="140"
          data-home-duration="700"
          data-home-distance="20"
        >
          <span>PDF</span>
          <div className="art-lines">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div
          className="art-spark spark-one"
          data-home-fade
          data-home-reveal
          data-home-delay="420"
        >
          +
        </div>
        <div
          className="art-spark spark-two"
          data-home-fade
          data-home-reveal
          data-home-delay="500"
        >
          +
        </div>
      </div>
    </div>
  );
}
