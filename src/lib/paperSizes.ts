const mmToPoints = (mm: number) => (mm / 25.4) * 72;

export const paperSizes = [
  {
    id: "A4",
    label: "A4",
    dimensions: "210 × 297 mm",
    width: mmToPoints(210),
    height: mmToPoints(297),
  },
  {
    id: "Letter",
    label: "Short / Letter",
    dimensions: "8.5 × 11 in",
    width: 612,
    height: 792,
  },
  {
    id: "Long",
    label: "Long / Folio",
    dimensions: "8.5 × 13 in",
    width: 612,
    height: 936,
  },
  {
    id: "Legal",
    label: "Legal",
    dimensions: "8.5 × 14 in",
    width: 612,
    height: 1008,
  },
  {
    id: "A3",
    label: "A3",
    dimensions: "297 × 420 mm",
    width: mmToPoints(297),
    height: mmToPoints(420),
  },
  {
    id: "A5",
    label: "A5",
    dimensions: "148 × 210 mm",
    width: mmToPoints(148),
    height: mmToPoints(210),
  },
  {
    id: "A6",
    label: "A6",
    dimensions: "105 × 148 mm",
    width: mmToPoints(105),
    height: mmToPoints(148),
  },
  {
    id: "Tabloid",
    label: "Tabloid",
    dimensions: "11 × 17 in",
    width: 792,
    height: 1224,
  },
  {
    id: "Executive",
    label: "Executive",
    dimensions: "7.25 × 10.5 in",
    width: 522,
    height: 756,
  },
] as const;

export type PaperSizeId = (typeof paperSizes)[number]["id"];
export function getPaperSize(id: string) {
  const paper = paperSizes.find((item) => item.id === id);
  if (!paper) throw new Error("Choose a supported paper size.");
  return paper;
}
export function getPageDimensions(
  id: string,
  orientation: "portrait" | "landscape",
) {
  const paper = getPaperSize(id);
  return orientation === "landscape"
    ? { width: paper.height, height: paper.width }
    : { width: paper.width, height: paper.height };
}
export function getImagePlacement(
  page: { width: number; height: number },
  image: { width: number; height: number },
  margin: number,
  alignment: "start" | "center" | "end",
) {
  if (
    !Number.isFinite(margin) ||
    margin < 0 ||
    margin * 2 >= Math.min(page.width, page.height)
  )
    throw new Error("Margins leave no room for the image.");
  const scale = Math.min(
    (page.width - margin * 2) / image.width,
    (page.height - margin * 2) / image.height,
  );
  const width = image.width * scale,
    height = image.height * scale;
  return {
    width,
    height,
    x:
      alignment === "start"
        ? margin
        : alignment === "end"
          ? page.width - margin - width
          : (page.width - width) / 2,
    y: (page.height - height) / 2,
  };
}
