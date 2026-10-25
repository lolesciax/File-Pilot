import {
  Files,
  SplitSquareHorizontal,
  Layers,
  Scaling,
  Minimize2,
  RefreshCw,
  FileImage,
  ListOrdered,
  FileOutput,
  RotateCw,
  Images,
  Crop,
  FileType2,
  Table2,
  Presentation,
} from "lucide-react";
const icons = {
  word: FileType2,
  excel: Table2,
  powerpoint: Presentation,
  merge: Files,
  split: SplitSquareHorizontal,
  layers: Layers,
  resize: Scaling,
  compress: Minimize2,
  convert: RefreshCw,
  imagepdf: FileImage,
  rename: ListOrdered,
  extract: FileOutput,
  rotate: RotateCw,
  image: Images,
  crop: Crop,
};
export function ToolIcon({ name, size = 24 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Files;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}
