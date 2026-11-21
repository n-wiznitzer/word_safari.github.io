
import type { Sticker, UserStickerProgress } from "../types/game";

interface MyStickersProps {
  stickers: Sticker[];
  progress: UserStickerProgress[];
  onExit: () => void;
}

const fallbackStickers = ["🏆", "🥇", "👑", "🏀", "🔥", "🏅", "🎯", "💎"];

export function MyStickers({
  stickers,
  progress,
  onExit,
}: MyStickersProps) {
  const stickerList = stickers.length
    ? stickers
    : fallbackStickers.map((emoji, index) => ({
        id: -(index + 1),
        name: `Sticker ${index + 1}`,
        emoji,
      }));

  const progressByStickerId = new Map(
    progress.map((item) => [item.sticker_id, item.sticker_count])
  );

  return (
    <div className="c">
      <div className="top">
        <span onClick={onExit} style={{ cursor: "pointer" }}>
          ←
        </span>
        <h2>My stickers</h2>
      </div>

      <p>Win Golden Rounds to collect them all!</p>

      <div className="grid">
        {stickerList.map((sticker) => {
          const count = progressByStickerId.get(sticker.id) ?? 0;

          return (
            <div
              key={sticker.id}
              className={`cd${count > 0 ? "" : " lk"}`}
            >
              {count > 0 ? (
                <>
                  {sticker.emoji}
                  <small>x{count}</small>
                </>
              ) : (
                <>
                  ❓
                  <small>&nbsp;</small>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
