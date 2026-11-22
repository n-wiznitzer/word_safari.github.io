import type { ReactNode } from "react";
import type { VocabularyCard } from "../types/game";

function comparison(
  left: ReactNode,
  right: ReactNode,
  correct: "left" | "right",
  className = ""
) {
  return (
    <span className={`pr ${className}`}>
      {[left, right].map((item, index) => (
        <i key={index}>
          {index === (correct === "right" ? 1 : 0) && <u>⬇️</u>}
          {item}
        </i>
      ))}
    </span>
  );
}

const person = "🧍";

const personShape = (value: string): ReactNode => {
  switch (value) {
    case "normal":
      return person;
    case "short":
      return <s className="sm">{person}</s>;
    case "fat":
      return <s className="f">{person}</s>;
    case "thin":
      return <s className="n">{person}</s>;
    default:
      return value;
  }
};

const legacyPictures: Record<string, ReactNode> = {
  fat: comparison(
    <s className="n">{person}</s>,
    <s className="f">{person}</s>,
    "right"
  ),
  thin: comparison(
    <s className="n">{person}</s>,
    <s className="f">{person}</s>,
    "left"
  ),
  tall: comparison(person, <s className="sm">{person}</s>, "left"),
  short: comparison(person, <s className="sm">{person}</s>, "right"),
  big: comparison("🐘", "🐭", "left"),
  small: comparison("🐘", "🐭", "right"),
  long: comparison("🚃🚃", "🚃", "left", "tr"),
  happy: comparison("😀", "😢", "left"),
  sad: comparison("😀", "😢", "right"),
  hot: comparison("🥵", "🥶", "left"),
  cold: comparison("🥵", "🥶", "right"),
  good: comparison("👍", "👎", "left"),
  bad: comparison("👍", "👎", "right"),
  new: comparison("👶", "🧓", "left"),
  old: comparison("👶", "🧓", "right"),
};

export function CardPicture({ card }: { card: VocabularyCard }) {
  const data = card.pic_data ?? {};

  if (data.left && data.right) {
    const left = String(data.left);
    const right = String(data.right);

    return comparison(
      personShape(left),
      personShape(right),
      data.correct === "right" ? "right" : "left",
      card.pic_type === "train_length" ? "tr" : ""
    );
  }

  return (
  <>
    {card.pic_type
      ? legacyPictures[card.word] ?? card.emoji ?? "❔"
      : card.emoji ?? "❔"}
  </>
);
}