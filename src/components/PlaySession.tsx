
import { useEffect, useMemo, useState } from "react";
import type { VocabularyCard, UserCardProgress } from "../types/game";
import { CardPicture } from "./CardPicture";

type QuestionType = "L" | "T" | "S" | "X";

interface Question {
  card: VocabularyCard;
  type: QuestionType;
}

interface PlaySessionProps {
  cards: VocabularyCard[];
  progress: UserCardProgress[];
  onComplete: (updates: UserCardProgress[]) => Promise<void>;
  onExit: () => void;
}

interface SessionCard {
  card: VocabularyCard;
  hadError: boolean;
}


const shuffle = <T,>(items: T[]): T[] =>
  [...items].sort(() => Math.random() - 0.5);


function speak(word: string) {
  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.8;

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Speech error:", error);
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine") {
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.2, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);

    oscillator.onended = () => void audio.close();
  } catch {
    // Audio is optional; gameplay should still work if unavailable.
  }
}

function ding() {
  playTone(660, 0.12);
  window.setTimeout(() => playTone(880, 0.2), 110);
}

function buzz() {
  playTone(160, 0.25, "sawtooth");
}

function getProgress(
  card: VocabularyCard,
  progress: UserCardProgress[]
): UserCardProgress {
  return (
    progress.find((item) => item.card_id === card.id) ?? {
      card_id: card.id,
      sessions_complete: 0,
      correct_streak: 0,
      is_mastered: false,
    }
  );
}

function buildSession(
  cards: VocabularyCard[],
  progress: UserCardProgress[]
): { sessionCards: SessionCard[]; questions: Question[] } {
  const get = (card: VocabularyCard) => getProgress(card, progress);

  const unmastered = cards.filter((card) => !get(card).is_mastered);
  const previouslyPracticed = unmastered.filter(
    (card) => get(card).sessions_complete > 0
  );

  const nearlyMastered = shuffle(
    previouslyPracticed.filter((card) => get(card).correct_streak >= 4)
  );

  const otherPracticed = shuffle(
    previouslyPracticed.filter((card) => get(card).correct_streak < 4)
  );

  const inProgress = nearlyMastered
    .concat(otherPracticed)
    .slice(0, Math.max(3, Math.min(nearlyMastered.length, 4)));

  const categories = [...new Set(cards.map((card) => card.category || "general"))];

  const freshCards = shuffle(categories)
    .map((category) =>
      unmastered.find(
        (card) =>
          (card.category || "general") === category &&
          get(card).sessions_complete === 0
      )
    )
    .filter((card): card is VocabularyCard => Boolean(card));

  const selectedCards = inProgress.concat(
    freshCards.slice(0, Math.max(1, 4 - inProgress.length))
  );

  const reviewCards = shuffle(
      cards.filter((card) => get(card).is_mastered)
  ).slice(0, selectedCards.length > 0 ? 1 : 4);

  const phases = (type: QuestionType): Question[] =>
    shuffle(selectedCards).map((card) => ({ card, type }));

  const questions: Question[] = [
    ...phases("L"),
    ...shuffle(selectedCards).flatMap((card) => [
      { card, type: "T" as const },
      { card, type: "S" as const },
    ]),
    ...reviewCards.flatMap((card) => [
      { card, type: "L" as const },
      { card, type: "T" as const },
    ]),
    ...phases("X"),
  ];

  return {
    sessionCards: selectedCards.map((card) => ({
      card,
      hadError: false,
    })),
    questions,
  };
}

export function PlaySession({
  cards,
  progress,
  onComplete,
  onExit,
}: PlaySessionProps) {
  const initial = useMemo(
    () => buildSession(cards, progress),
    [cards, progress]
  );
  const [answerFeedback, setAnswerFeedback] = useState<{
  cardId: number;
  result: "ok" | "no";
} | null>(null);
  const [completedProgress, setCompletedProgress] = useState<UserCardProgress[]>([]);
  const [questions] = useState(initial.questions);
  const [sessionCards] = useState(initial.sessionCards);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [spelling, setSpelling] = useState<string[]>([]);
  const [spellingErrors, setSpellingErrors] = useState(0);
  const [spellingHelp, setSpellingHelp] = useState(false);
  const [usedLetters, setUsedLetters] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const question = questions[questionIndex];

  const options = useMemo(() => {
    if (!question || question.type === "S" || question.type === "X") {
      return [];
    }

    return shuffle([
      question.card,
      ...shuffle(cards.filter((card) => card.id !== question.card.id)).slice(
        0,
        3
      ),
    ]);
  }, [questionIndex, questions, cards]);

  const letters = useMemo(() => {
    if (!question || (question.type !== "S" && question.type !== "X")) {
      return [];
    }

    const wordLetters = question.card.word.replace(/\s/g, "").split("");
    const extraLetters = shuffle(
      "aeioutnrsldm".split("").filter((letter) => !wordLetters.includes(letter))
    ).slice(0, 2);

    return shuffle([...wordLetters, ...extraLetters]);
  }, [questionIndex, questions]);

  useEffect(() => {
    if (question && (question.type === "L" || question.type === "T")) {
      speak(question.card.word);
    }

    if (question && (question.type === "S" || question.type === "X")) {
      speak(question.card.word);
    }
  }, [questionIndex]);

  function markError(cardId: number) {
    const selected = sessionCards.find((item) => item.card.id === cardId);
    if (selected) selected.hadError = true;
  }

  function nextQuestion() {
    setSpelling([]);
    setSpellingErrors(0);
    setSpellingHelp(false);
    setUsedLetters([]);

    if (questionIndex + 1 >= questions.length) {
      void finishSession();
    } else {
      setQuestionIndex((index) => index + 1);
    }
  }

function answerChoice(correct: boolean, cardId: number) {
  if (correct) {
    setAnswerFeedback({ cardId, result: "ok" });
    ding();
    window.setTimeout(() => {
      setAnswerFeedback(null);
      nextQuestion();
    }, 650);
  } else {
    setAnswerFeedback({ cardId, result: "no" });
    buzz();
    markError(cardId);

    window.setTimeout(() => {
      setAnswerFeedback(null);
    }, 400);
  }
}
  function chooseLetter(letter: string, index: number) {
    if (!question) return;

    const expected = question.card.word.replace(/\s/g, "").toLowerCase();
    const position = spelling.length;

    if (letter.toLowerCase() === expected[position]) {
      const next = [...spelling, letter];
      setSpelling(next);
      setUsedLetters((current) => [...current, index]);
      playTone(700, 0.08);

      if (next.length === expected.length) {
        ding();
        window.setTimeout(nextQuestion, 750);
      }
      return;
    }

    buzz();
    markError(question.card.id);

    const errors = spellingErrors + 1;
    setSpellingErrors(errors);

    if (errors >= 5 && !spellingHelp) {
      setSpellingHelp(true);
      setSpelling([]);
      setUsedLetters([]);
    } else if (!spellingHelp) {
      setSpelling([]);
      setUsedLetters([]);
    }
  }

  async function finishSession() {
    setSaving(true);

    const updates = sessionCards.map(({ card, hadError }) => {
      const previous = getProgress(card, progress);
      const sessionsComplete = previous.sessions_complete + 1;
      const correctStreak = hadError
        ? previous.correct_streak
        : previous.correct_streak + 1;

      return {
        card_id: card.id,
        sessions_complete: sessionsComplete,
        correct_streak: correctStreak,
        is_mastered: previous.is_mastered || correctStreak >= 5,
      };
    });
    setCompletedProgress(updates);
    try {
      await onComplete(updates);
      setFinished(true);
    } catch {
      setSaving(false);
    }
  }
  if (saving) {
      return (
        <div className="c">
          <div className="hero">💾</div>
          <h2>Saving your progress...</h2>
        </div>
      );
    }
  if (finished) {
    return (
      <div className="c">
        <div className="hero">🎉</div>
        <h2>Great job!</h2>

        {sessionCards.map(({ card }) => {
        const streak =
          completedProgress.find((item) => item.card_id === card.id)
            ?.correct_streak ?? 0;
          return (
            <p key={card.id}>
              {card.emoji} {card.word} &nbsp;
              {"●".repeat(Math.min(streak, 5))}
              {"○".repeat(5 - Math.min(streak, 5))}
            </p>
          );
        })}

        <button className="big" onClick={onExit}>
          Back to home
        </button>
      </div>
    );
  }


  if (!question) {
    return (
      <div className="c">
        <p>There are no cards available yet.</p>
        <button className="big alt" onClick={onExit}>
          Back
        </button>
      </div>
    );
  }

  const word = question.card.word;
  const isSpelling = question.type === "S" || question.type === "X";
  const expectedWord = word.replace(/\s/g, "").toLowerCase();

  return (
    <>
      <div className="top">
        <button type="button" onClick={onExit} aria-label="Exit session">
          ✕
        </button>
        <div className="pb">
          <i style={{ width: `${(questionIndex / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="c">
        <div className="tm">
          <i />
        </div>

        {question.type === "L" && (
          <>
            <button className="spk" onClick={() => speak(word)}>
              🔊
            </button>
            <p>Listen. Tap the word.</p>
            <div className="opts">
              {options.map((option) => (
                <button
                  className={`opt ${
                  answerFeedback?.cardId === option.id
                    ? answerFeedback.result
                    : ""
                }`}
                  key={option.id}
                  onClick={() =>
                    answerChoice(option.id === question.card.id, question.card.id)
                  }
                >
                  {option.word}
                </button>
              ))}
            </div>
          </>
        )}

        {question.type === "T" && (
          <>
            <h2 className="word">{word.toUpperCase()}</h2>
            <div className="opts">
              {options.map((option) => (
                <button
                  className={`opt pic ${
                    answerFeedback?.cardId === option.id
                      ? answerFeedback.result
                      : ""
                  }`}
                  key={option.id}
                  onClick={() =>
                    answerChoice(option.id === question.card.id, question.card.id)
                  }
                >
                  <CardPicture card={option} />
                </button>
              ))}
            </div>
          </>
        )}

        {isSpelling && (
          <>
            <h2>Spell it!</h2>
            <div className="pic">
              <CardPicture card={question.card} />
            </div>
            <button className="spk" onClick={() => speak(word)}>
              🔊
            </button>

            <div className="slots">
              {expectedWord.split("").map((_, index) => (
                <b key={index}>{spelling[index] ?? ""}</b>
              ))}
            </div>

            <div className="opts" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {letters.map((letter, index) => (
                <button
                  className="opt tl"
                  key={`${letter}-${index}`}
                  disabled={usedLetters.includes(index)}
                  onClick={() => chooseLetter(letter, index)}
                >
                  {letter}
                </button>
              ))}
            </div>

            {spellingHelp && <p>Listen to each letter 👂</p>}
          </>
        )}

        <p>
          Question {questionIndex + 1} of {questions.length}
        </p>
      </div>
    </>
  );
}