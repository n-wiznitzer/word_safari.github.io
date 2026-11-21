import { MyStickers } from "./components/MyStickers";
import { MyCards } from "./components/MyCards";
import { PlaySession } from "./components/PlaySession";
import type { UserCardProgress } from "./types/game";

import { loadGameData } from "./services/gameData";
import type { GameData } from "./types/game";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "./services/supabase";
import {
  isValidUsername,
  signIn,
  signOut,
  signUp,
} from "./services/auth";
import type { LearnerProfile } from "./types/user";

type AuthMode = "signin" | "signup";

function App() {
  const [screen, setScreen] = useState<"home" | "play" | "cards" | "stickers">("home");
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Restore the existing Supabase session and listen for auth changes.
  useEffect(() => {
    let mounted = true;

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
      }
    });

    supabase.auth
        .getSession()
        .then(({data, error: sessionError}) => {
          if (!mounted) return;

          if (sessionError) {
            setError(sessionError.message);
          }

          setSession(data.session);
          setLoading(false);
        })
        .catch((err: Error) => {
          if (!mounted) return;
          setError(err.message);
          setLoading(false);
        });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load the learner profile whenever the authenticated user changes.
  useEffect(() => {
    let cancelled = false;

    async function loadProfile(user: User) {
      setProfileLoading(true);
      setError("");

      try {
        const learnerProfile = await getOrCreateProfile(user);
        const learnerGameData = await loadGameData(learnerProfile.id);

        if (!cancelled) {
          setProfile(learnerProfile);
          setGameData(learnerGameData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
              err instanceof Error
                  ? err.message
                  : "Could not load learner profile."
          );
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    if (session?.user) {
      setProfile(null);
      void loadProfile(session.user);
    } else {
      setProfile(null);
      setGameData(null);
      setProfileLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanUsername = username.trim().toLowerCase();

    if (!isValidUsername(cleanUsername)) {
      setError(
          "Use 3–24 letters, numbers, dots, dashes or underscores for your username."
      );
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (authMode === "signin") {
        const {error: authError} = await signIn(
            cleanUsername,
            password
        );

        if (authError) {
          throw new Error("Sign-in failed. Check your username and password.");
        }
      } else {
        const {data, error: authError} = await signUp(
            cleanUsername,
            password
        );

        if (authError) {
          if (
              authError.message.toLowerCase().includes("already registered") ||
              authError.message.toLowerCase().includes("already been registered")
          ) {
            throw new Error("That username may already be taken.");
          }

          throw new Error(authError.message);
        }

        if (!data.session) {
          setMessage(
              "Account created, but email confirmation is enabled in Supabase. " +
              "For username-only accounts, disable Confirm email in Supabase Auth settings."
          );
        }
      }
    } catch (err) {
      setError(
          err instanceof Error ? err.message : "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setError("");

    const {error: signOutError} = await signOut();

    if (signOutError) {
      setError(signOutError.message);
    }
  }


  async function handleSessionComplete(updates: UserCardProgress[]) {
    if (!profile) {
      throw new Error("Learner profile is not available.");
    }

    const rows = updates.map((item) => ({
      ...item,
      user_id: profile.id,
    }));

    if (rows.length === 0) return;

    const {error: saveError} = await supabase
        .from("fact_user_cards")
        .upsert(rows, {onConflict: "user_id,card_id"});

    if (saveError) {
      throw new Error(`Could not save learning progress: ${saveError.message}`);
    }

    setGameData((current) => {
      if (!current) return current;

      const updatedByCardId = new Map(
          updates.map((item) => [item.card_id, item])
      );

      const existing = current.cardProgress.filter(
          (item) => !updatedByCardId.has(item.card_id)
      );

      return {
        ...current,
        cardProgress: [...existing, ...updates],
      };
    });
  }


  if (loading) {
    return (
        <div id="app">
          <div className="c">
            <div className="hero">🦁</div>
            <h1>Word Safari</h1>
            <p>Loading...</p>
          </div>
        </div>
    );
  }

  if (!session) {
    return (
        <div id="app">
          <div className="c">
            <div className="hero">🦁</div>
            <h1>Word Safari</h1>
            <p>
              {authMode === "signin"
                  ? "Sign in with your username and password"
                  : "Create your learner account"}
            </p>

            <form
                onSubmit={handleSubmit}
                style={{
                  width: "100%",
                  display: "grid",
                  gap: 12,
                }}
            >
              <input
                  type="text"
                  autoComplete="username"
                  placeholder="Username (3–24 characters)"
                  minLength={3}
                  maxLength={24}
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  style={inputStyle}
              />

              <input
                  type="password"
                  autoComplete={
                    authMode === "signin" ? "current-password" : "new-password"
                  }
                  placeholder="Password (at least 6 characters)"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  style={inputStyle}
              />

              <button className="big" type="submit" disabled={loading}>
                {loading
                    ? "Please wait..."
                    : authMode === "signin"
                        ? "Sign in"
                        : "Create account"}
              </button>
            </form>

            <button
                className="big alt"
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signin" ? "signup" : "signin");
                  setError("");
                  setMessage("");
                }}
            >
              {authMode === "signin"
                  ? "Create account"
                  : "Back to sign in"}
            </button>

            <p style={{fontSize: ".85rem", fontWeight: 500}}>
              Usernames may contain letters, numbers, dots, dashes and
              underscores.
            </p>

            {error && <p style={errorStyle}>{error}</p>}
            {message && <p style={messageStyle}>{message}</p>}
          </div>
        </div>
    );
  }

  if (profileLoading || !profile) {
    return (
        <div id="app">
          <div className="c">
            <div className="hero">🦁</div>
            <h1>Word Safari</h1>
            <p>{profileLoading ? "Loading your profile..." : error}</p>
            {error && (
                <button className="big alt" onClick={handleSignOut}>
                  Sign out
                </button>
            )}
          </div>
        </div>
    );
  }

  return (
      <div id="app">
        {screen === "play" ? (
  <PlaySession
    cards={gameData?.cards ?? []}
    progress={gameData?.cardProgress ?? []}
    onComplete={handleSessionComplete}
    onExit={() => setScreen("home")}
  />
) : screen === "cards" ? (
  <MyCards
    cards={gameData?.cards ?? []}
    progress={gameData?.cardProgress ?? []}
    onExit={() => setScreen("home")}
  />
) : screen === "stickers" ? (
  <MyStickers
    stickers={gameData?.stickers ?? []}
    progress={gameData?.stickerProgress ?? []}
    onExit={() => setScreen("home")}
  />
) : (  // Keep your existing home screen JSX here, unchanged. : (
            <div className="c">
              <div className="hero">🦁</div>
              <h1>Word Safari</h1>
              <h2>Welcome, {profile.name}!</h2>
              <p>Your learner profile is connected.</p>
              <p>⭐ {profile.gold_stars ?? 0}</p>

              <button
                  className="big"
                  onClick={() => setScreen("play")}
              >
                Play
              </button>

              <button
              className="big alt"
              onClick={() => setScreen("cards")}
            >
              My cards
            </button>

            <button
              className="big alt"
              onClick={() => setScreen("stickers")}
            >
              My stickers
            </button>
              <button className="big alt" onClick={handleSignOut}>
                Sign out
              </button>

              {error && <p style={errorStyle}>{error}</p>}
            </div>
        )}
      </div>
  );
}

// Find an existing profile or create one for a newly registered learner.
async function getOrCreateProfile(user: User): Promise<LearnerProfile> {
  const { data: profiles, error: profileError } = await supabase
    .from("dim_users")
    .select("*")
    .eq("auth_user_id", user.id)
    .limit(1);

  if (profileError) throw profileError;

  if (profiles?.length) {
    return profiles[0] as LearnerProfile;
  }

  const username =
    user.user_metadata?.username ??
    user.email?.split("@")[0] ??
    "learner";

  const learnerName = user.user_metadata?.learner_name ?? username;

  const { data: themes, error: themeError } = await supabase
    .from("dim_themes")
    .select("id,name");

  if (themeError) throw themeError;

  const basketball = themes?.find(
    (theme) => theme.name.toLowerCase() === "basketball"
  );

  const { data: createdProfile, error: createError } = await supabase
    .from("dim_users")
    .insert({
      auth_user_id: user.id,
      name: learnerName,
      username,
      theme_id: basketball?.id ?? null,
      card_level: 1,
      activity_level: 1,
      gold_stars: 0,
    })
    .select("*")
    .single();

  if (createError) throw createError;

  return createdProfile as LearnerProfile;
}

const inputStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 14,
  border: "2px solid #d8c6a8",
  font: "inherit",
};

const errorStyle = {
  color: "#b42318",
  fontSize: ".95rem",
  overflowWrap: "anywhere" as const,
};

const messageStyle = {
  color: "#3d7a42",
  fontSize: ".95rem",
  overflowWrap: "anywhere" as const,
};

export default App;