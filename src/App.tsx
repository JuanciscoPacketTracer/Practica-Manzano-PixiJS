import { Experience } from "./components/Experience/Experience"
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import redAppleAsset from "./assets/images/apple_0.bmp";
import greenAppleAsset from "./assets/images/apple_1.bmp";
import goldenAppleAsset from "./assets/images/apple_2.bmp";
import heartAsset from "./assets/images/heart_0.bmp";
import bg1Music from "./assets/audio/music/bg1.mp3";
import bg2Music from "./assets/audio/music/bg2.ogg";
import bg3Music from "./assets/audio/music/bg3.mp3";
import bg4Music from "./assets/audio/music/bg4.mp3";
import applauseSound from "./assets/audio/sounds/applause.mp3";
import countSound from "./assets/audio/sounds/count.mp3";
import defeatSound from "./assets/audio/sounds/defeat.mp3";
import goSound from "./assets/audio/sounds/go.mp3";
import { MUSIC_VOLUMES, SOUND_EFFECT_VOLUMES } from "./constants/audio";
import type { CollectedApples } from "./types/game";
import "./index.css";

interface GameResult {
  outcome: "victory" | "defeat";
  collectedApples: CollectedApples;
}

const playSound = (source: string, volume: number) => {
  const audio = new Audio(source);
  audio.volume = volume;
  void audio.play().catch(() => undefined);
};

const App = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const unlockAudio = () => {
    if (audioUnlocked) return;
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    if (!audio.src) audio.src = bg1Music;
    audio.loop = true;
    audio.volume = MUSIC_VOLUMES.bg1;
    audio.muted = false;
    audio.play().then(() => {
      setAudioUnlocked(true);
    }).catch(() => {
      setAudioUnlocked(false);
    });
  };

  const startGame = () => {
    unlockAudio();
    setGameResult(null);
    if (isPaused) {
      setIsPaused(false);
      return;
    }
    setCountdown(3);
  };

  const handleGameOver = (outcome: GameResult["outcome"], collectedApples: CollectedApples) => {
    setIsPlaying(false);
    setIsPaused(false);
    setGameResult({ outcome, collectedApples });
  };

  useEffect(() => {
    if (countdown === null) return;

    const countdownTimer = window.setTimeout(() => {
      if (countdown === 0) {
        setCountdown(null);
        setIsPlaying(true);
        return;
      }
      setCountdown(countdown - 1);
    }, 900);

    return () => window.clearTimeout(countdownTimer);
  }, [countdown]);

  useEffect(() => {
    if (countdown === null) return;
    playSound(countdown === 0 ? goSound : countSound, countdown === 0 ? SOUND_EFFECT_VOLUMES.go : SOUND_EFFECT_VOLUMES.count);
  }, [countdown]);

  useEffect(() => {
    if (!gameResult) return;
    playSound(
      gameResult.outcome === "victory" ? applauseSound : defeatSound,
      gameResult.outcome === "victory" ? SOUND_EFFECT_VOLUMES.applause : SOUND_EFFECT_VOLUMES.defeat,
    );
  }, [gameResult]);

  useEffect(() => {
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;

    const track = gameResult
      ? gameResult.outcome === "victory" ? bg3Music : bg4Music
      : isPlaying && !isPaused && countdown === null ? bg2Music : bg1Music;
    const volume = gameResult
      ? gameResult.outcome === "victory" ? MUSIC_VOLUMES.bg3 : MUSIC_VOLUMES.bg4
      : isPlaying && !isPaused && countdown === null ? MUSIC_VOLUMES.bg2 : MUSIC_VOLUMES.bg1;

    if (audio.src !== new URL(track, window.location.href).href) {
      audio.src = track;
      audio.currentTime = 0;
    }
    audio.loop = true;
    audio.volume = volume;
    void audio.play().then(() => {
      if (!audioUnlocked) setAudioUnlocked(true);
    }).catch(() => undefined);
  }, [audioUnlocked, countdown, gameResult, isPaused, isPlaying]);

  const isMenuVisible = !isPlaying && countdown === null || isPaused;
  const isCountdownVisible = countdown !== null;
  const countdownLabel = countdown === 0 ? "¡Vamos!" : countdown;

  return (
    <main className="game-shell">
      <Experience key={isPlaying ? "playing" : "idle"} isPlaying={isPlaying} isPaused={isPaused} onGameOver={handleGameOver} />
      {isPlaying && !isPaused && (
        <button
          className="pause-button"
          type="button"
          aria-label="Pausar juego"
          title="Pausar juego"
          onClick={() => setIsPaused(true)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      )}
      {isCountdownVisible && (
        <section className="countdown-overlay" aria-live="assertive" aria-label={`Comienza en ${countdownLabel}`}>
          <span>{countdownLabel}</span>
        </section>
      )}
      {gameResult && (
        <section className={`result-screen result-screen--${gameResult.outcome}`} aria-live="polite" aria-label={gameResult.outcome === "victory" ? "Pantalla de victoria" : "Pantalla de derrota"}>
          {gameResult.outcome === "victory" && (
            <div className="confetti" aria-hidden="true">
              {Array.from({ length: 56 }, (_, index) => {
                const isLeft = index < 28;
                const pieceIndex = index % 28;
                const spread = 22 + (pieceIndex % 7) * 4;
                const originOffset = (pieceIndex % 9) * 3 - 12;
                const duration = 2.8 + (pieceIndex % 8) * 0.18;
                const shape = pieceIndex % 3 === 0 ? "confetti__piece--ribbon" : "";
                const style = {
                  "--confetti-delay": `${(pieceIndex % 10) * 0.07}s`,
                  "--confetti-color": ["#f6d77a", "#d85b3f", "#79a85b", "#fff8dc"][index % 4],
                  "--confetti-origin-x": `${originOffset}px`,
                  "--confetti-origin-y": `${(pieceIndex % 5) * 5 - 0}px`,
                  "--confetti-launch-x": `${spread * 0.28}vw`,
                  "--confetti-peak-x": `${spread * 0.82}vw`,
                  "--confetti-fall-x": `${spread}vw`,
                  "--confetti-duration": `${duration}s`,
                  "--confetti-mid-x": `${(pieceIndex % 4) * 35 - 52}deg`,
                  "--confetti-mid-y": `${(pieceIndex % 5) * 40 - 80}deg`,
                  "--confetti-end-x": `${(pieceIndex % 5) * 100 + 280}deg`,
                  "--confetti-end-y": `${(pieceIndex % 4) * 80 - 120}deg`,
                } as CSSProperties;
                return <i key={index} className={`confetti__piece ${isLeft ? "confetti__piece--left" : "confetti__piece--right"} ${shape}`} style={style} />;
              })}
            </div>
          )}
          <div className="result-screen__panel">
            <p className="main-menu__eyebrow">El árbol de Manzano</p>
            <h1>{gameResult.outcome === "victory" ? "Ganaste!" : "Perdiste!"}</h1>
            <div className="result-screen__stats">
              <div><img src={redAppleAsset} alt="" /><span>Rojas</span><strong>{gameResult.collectedApples.red}</strong></div>
              <div><img src={greenAppleAsset} alt="" /><span>Verdes</span><strong>{gameResult.collectedApples.green}</strong></div>
              <div><img src={goldenAppleAsset} alt="" /><span>Doradas</span><strong>{gameResult.collectedApples.golden}</strong></div>
              <div className="result-screen__total"><span>Total recogidas</span><strong>{Object.values(gameResult.collectedApples).reduce((total, count) => total + count, 0)}</strong></div>
            </div>
            <button className="main-menu__button" type="button" onClick={startGame}>Volver a jugar!</button>
          </div>
        </section>
      )}
      {isMenuVisible && !gameResult && (
        <section className="main-menu" aria-label="Menú principal">
          <div className="main-menu__panel">
            <p className="main-menu__eyebrow">El árbol de Manzano</p>
            <h1>Recoge las manzanas!</h1>
            <ul className="main-menu__instructions">
              <li>
                <span className="main-menu__rule-icon main-menu__rule-icon--hearts" aria-hidden="true">
                  {[0, 1, 2].map((heart) => <img key={heart} src={heartAsset} alt="" />)}
                </span>
                <span>Tienes x3 vidas</span>
              </li>
              <li>
                <img className="main-menu__rule-icon" src={redAppleAsset} alt="" />
                <span>Obtén x50 manzanas rojas para ganar</span>
              </li>
              <li>
                <img className="main-menu__rule-icon" src={greenAppleAsset} alt="" />
                <span>Manzana verde: pierdes x1 vida</span>
              </li>
              <li>
                <img className="main-menu__rule-icon" src={goldenAppleAsset} alt="" />
                <span>Manzana dorada: ganas x1 vida</span>
              </li>
            </ul>
            <button className="main-menu__button" type="button" onClick={startGame}>
              {isPaused ? "Continuar" : "Jugar"}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
export default App