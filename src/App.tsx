import { Experience } from "./components/Experience/Experience"
import { useEffect, useState } from "react";
import redAppleAsset from "./assets/apple_0.bmp";
import greenAppleAsset from "./assets/apple_1.bmp";
import goldenAppleAsset from "./assets/apple_2.bmp";
import heartAsset from "./assets/heart_0.bmp";
import "./index.css";

const App = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startGame = () => {
    if (isPaused) {
      setIsPaused(false);
      return;
    }
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;

    const countdownTimer = window.setTimeout(() => {
      if (countdown === 1) {
        setCountdown(null);
        setIsPlaying(true);
        return;
      }
      setCountdown(countdown - 1);
    }, 900);

    return () => window.clearTimeout(countdownTimer);
  }, [countdown]);

  const isMenuVisible = !isPlaying && countdown === null || isPaused;
  const isCountdownVisible = countdown !== null;
  const countdownLabel = countdown === 1 ? "¡Vamos!" : countdown;

  return (
    <main className="game-shell">
      <Experience isPlaying={isPlaying} isPaused={isPaused} />
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
      {isMenuVisible && (
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