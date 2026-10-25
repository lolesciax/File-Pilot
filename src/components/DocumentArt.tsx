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
        <div className="art-sheet art-zip">
          <FileArchive size={63} />
          <div className="art-lines">
            <i />
            <i />
          </div>
        </div>
        <div className="art-sheet art-image">
          <Image size={85} />
          <div className="art-lines">
            <i />
            <i />
          </div>
        </div>
        <div className="art-sheet art-pdf">
          <span>PDF</span>
          <div className="art-lines">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="art-spark spark-one">+</div>
        <div className="art-spark spark-two">+</div>
      </div>
    </div>
  );
}
