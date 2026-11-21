
import type { VocabularyCard, UserCardProgress } from "../types/game";
import { CardPicture } from "./CardPicture";

interface MyCardsProps {
  cards: VocabularyCard[];
  progress: UserCardProgress[];
  onExit: () => void;
}

export function MyCards({ cards, progress, onExit }: MyCardsProps) {
  const progressByCardId = new Map(
    progress.map((item) => [item.card_id, item])
  );

  return (
    <>
      <div className="top">
        <span onClick={onExit} style={{ cursor: "pointer" }}>
          ←
        </span>
        <h2>My cards</h2>
      </div>

      <div className="grid">
        {cards.map((card) => {
          const cardProgress = progressByCardId.get(card.id);
          const mastered = cardProgress?.is_mastered ?? false;
          const streak = cardProgress?.correct_streak ?? 0;

          return (
            <div
              key={card.id}
              className={`cd${mastered ? "" : " lk"}`}
            >
              {mastered ? (
                <>
                  <CardPicture card={card} />
                  <small>{card.word}</small>
                </>
              ) : (
                <>
                  🔒
                  <small>{streak}/5</small>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
