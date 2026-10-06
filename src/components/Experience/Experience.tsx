import { Container, Sprite, Stage, useTick } from "@pixi/react";
import { Container as PixiContainer, Graphics as PixiGraphics, Sprite as PixiSpriteClass, Texture } from "pixi.js";
import type { Sprite as PixiSprite } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apple0Asset from "../../assets/images/apple_0.png";
import apple1Asset from "../../assets/images/apple_1.png";
import apple2Asset from "../../assets/images/apple_2.png";
import collectGoldenSound from "../../assets/audio/sounds/collect_golden.mp3";
import collectGreenSound from "../../assets/audio/sounds/collect_green.mp3";
import collectRedSound from "../../assets/audio/sounds/collect_red.mp3";
import fallsSound from "../../assets/audio/sounds/falls.mp3";
import spawnSound from "../../assets/audio/sounds/spawn.mp3";
import { calculateCanvasSize, calculateGameOffset, calculateGameScale, GAME_SIZE } from "../../helpers/common";
import { playEffect } from "../../helpers/audioManager";
import { SOUND_EFFECT_VOLUMES } from "../../constants/audio";
import type { AppleType, CollectedApples, FallingApple, GameMode } from "../../types/game";
import { MainContainer } from "./MainContainer/MainContainer";
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const PLAYER_SPRITE_SIZE = 40;
const PLAYER_Y = 220;
const PLAYER_SPEED = 3.5;
const APPLE_SIZE = 20;
const MAX_LIVES = 3;
const SPAWN_INTERVAL = 0.7;
const SPAWN_X_MIN = 30;
const SPAWN_X_MAX = 210;
const SPAWN_Y_MIN = 20;
const SPAWN_Y_MAX = 120;
const APPLE_SWING_DURATION = 1.5;
const GOLDEN_SHINE_DURATION = 0.95;
const COLLISION_SIZE_RATIO = 0.8;
const SIDEWAYS_COLLECTION = true;
const APPLE_TYPES: { type: AppleType; spawnChance: number; fallingSpeed: number }[] = [
    { type: "red", spawnChance: 0.57, fallingSpeed: 2.2 },
    { type: "green", spawnChance: 0.37, fallingSpeed: 2.2 },
    { type: "golden", spawnChance: 0.06, fallingSpeed: 3.2 },
];
const SOUND_EFFECTS = {
    golden: { source: collectGoldenSound, volume: SOUND_EFFECT_VOLUMES.collectGolden },
    green: { source: collectGreenSound, volume: SOUND_EFFECT_VOLUMES.collectGreen },
    red: { source: collectRedSound, volume: SOUND_EFFECT_VOLUMES.collectRed },
    falls: { source: fallsSound, volume: SOUND_EFFECT_VOLUMES.falls },
    spawn: { source: spawnSound, volume: SOUND_EFFECT_VOLUMES.spawn },
} as const;
const basketAssets = import.meta.glob("../../assets/images/baskets/basket*.png", { eager: true, import: "default", query: "?url" }) as Record<string, string>;
const basketAssetEntries = Object.entries(basketAssets).sort(([firstPath], [secondPath]) => {
    const getFrame = (path: string) => path.endsWith("/basket.png") ? 0 : Number(path.match(/basket(\d+)\.png$/)?.[1] ?? 0);
    return getFrame(firstPath) - getFrame(secondPath);
});

const playSound = (sound: { source: string; volume: number }) => {
    playEffect(sound);
};

const pickAppleType = () => {
    const randomValue = Math.random();
    let chanceTotal = 0;
    for (const appleType of APPLE_TYPES) {
        chanceTotal += appleType.spawnChance;
        if (randomValue < chanceTotal) return appleType.type;
    }
    return "red" as const;
};

const collides = (first: { x: number; y: number; width: number; height: number }, second: typeof first) => {
    const firstInsetX = (first.width * (1 - COLLISION_SIZE_RATIO)) / 2;
    const firstInsetY = (first.height * (1 - COLLISION_SIZE_RATIO)) / 2;
    const secondInsetX = (second.width * (1 - COLLISION_SIZE_RATIO)) / 2;
    const secondInsetY = (second.height * (1 - COLLISION_SIZE_RATIO)) / 2;
    const firstHitbox = {
        x: first.x + firstInsetX,
        y: first.y + firstInsetY,
        width: first.width * COLLISION_SIZE_RATIO,
        height: first.height * COLLISION_SIZE_RATIO,
    };
    const secondHitbox = {
        x: second.x + secondInsetX,
        y: second.y + secondInsetY,
        width: second.width * COLLISION_SIZE_RATIO,
        height: second.height * COLLISION_SIZE_RATIO,
    };

    return firstHitbox.x < secondHitbox.x + secondHitbox.width &&
        firstHitbox.x + firstHitbox.width > secondHitbox.x &&
        firstHitbox.y < secondHitbox.y + secondHitbox.height &&
        firstHitbox.y + firstHitbox.height > secondHitbox.y;
};

interface GameSceneProps {
    gameScale: number;
    gameOffset: { x: number; y: number };
    isPlaying: boolean;
    isPaused: boolean;
    mode: GameMode;
    keysRef: React.MutableRefObject<Record<string, boolean>>;
    onScoreChange: (score: number) => void;
    onLivesChange: (lives: number) => void;
    onLifeRecovered: (lives: number) => void;
    onGameOver: (result: "victory" | "defeat", collectedApples: CollectedApples) => void;
}

interface ExperienceProps {
    isPlaying: boolean;
    isPaused: boolean;
    mode: GameMode;
    onGameOver: (result: "victory" | "defeat", collectedApples: CollectedApples) => void;
}

interface AppleEntity {
    data: FallingApple;
    sprite: PixiSprite;
}

interface GoldenShineEntity {
    age: number;
    container: PixiContainer;
}

const GameScene = ({ gameScale, gameOffset, isPlaying, isPaused, mode, keysRef, onScoreChange, onLivesChange, onLifeRecovered, onGameOver }: GameSceneProps) => {
    const scoreRef = useRef(0);
    const livesRef = useRef(MAX_LIVES);
    const playerXRef = useRef(120);
    const playerSpriteRef = useRef<PixiSprite | null>(null);
    const appleContainerRef = useRef<PixiContainer | null>(null);
    const shineContainerRef = useRef<PixiContainer | null>(null);
    const applesRef = useRef<Map<number, AppleEntity>>(new Map());
    const spawnTimer = useRef(0);
    const nextAppleId = useRef(0);
    const collectedApplesRef = useRef<CollectedApples>({ red: 0, green: 0, golden: 0 });
    const goldenShinesRef = useRef<Map<number, GoldenShineEntity>>(new Map());
    const gameOverRef = useRef(false);
    const basketTextures = useMemo(() => basketAssetEntries.map(([, asset]) => Texture.from(asset)), []);
    const appleTextures = useMemo(() => ({
        red: Texture.from(apple0Asset),
        green: Texture.from(apple1Asset),
        golden: Texture.from(apple2Asset),
    }), []);
    const logicalCanvasWidth = GAME_SIZE;
    const logicalCanvasHeight = GAME_SIZE;
    const treeOriginX = 0;
    const treeOriginY = 0;

    const removeApple = useCallback((id: number) => {
        const apple = applesRef.current.get(id);
        if (!apple) return;
        apple.sprite.removeFromParent();
        apple.sprite.destroy();
        applesRef.current.delete(id);
    }, []);

    const removeShine = useCallback((id: number) => {
        const shine = goldenShinesRef.current.get(id);
        if (!shine) return;
        shine.container.removeFromParent();
        shine.container.destroy({ children: true });
        goldenShinesRef.current.delete(id);
    }, []);

    const resetGame = useCallback(() => {
        applesRef.current.forEach((_, id) => removeApple(id));
        goldenShinesRef.current.forEach((_, id) => removeShine(id));
        scoreRef.current = 0;
        livesRef.current = MAX_LIVES;
        playerXRef.current = 120;
        spawnTimer.current = 0;
        nextAppleId.current = 0;
        collectedApplesRef.current = { red: 0, green: 0, golden: 0 };
        gameOverRef.current = false;
        keysRef.current = {};
        if (playerSpriteRef.current) playerSpriteRef.current.texture = basketTextures[0];
        onScoreChange(0);
        onLivesChange(MAX_LIVES);
    }, [basketTextures, keysRef, onLivesChange, onScoreChange, removeApple, removeShine]);

    useEffect(() => {
        if (isPlaying) resetGame();
        else keysRef.current = {};
    }, [isPlaying, keysRef, resetGame]);

    useEffect(() => () => {
        applesRef.current.forEach((_, id) => removeApple(id));
        goldenShinesRef.current.forEach((_, id) => removeShine(id));
    }, [removeApple, removeShine]);

    useTick((delta) => {
        if (!isPlaying || isPaused || livesRef.current <= 0 || (mode === "classic" && scoreRef.current >= 50)) return;
        const frameTime = delta / 60;
        const moveAmount = PLAYER_SPEED * delta;
        if (keysRef.current.a || keysRef.current.arrowleft) playerXRef.current -= moveAmount;
        if (keysRef.current.d || keysRef.current.arrowright) playerXRef.current += moveAmount;
        playerXRef.current = Math.max(0, Math.min(logicalCanvasWidth - PLAYER_WIDTH, playerXRef.current));
        if (playerSpriteRef.current) {
            playerSpriteRef.current.x = gameOffset.x + playerXRef.current * gameScale;
            playerSpriteRef.current.y = gameOffset.y + PLAYER_Y * gameScale;
            playerSpriteRef.current.width = PLAYER_SPRITE_SIZE * gameScale;
            playerSpriteRef.current.height = PLAYER_SPRITE_SIZE * gameScale;
            const basketStep = mode === "classic" ? 2 : 8;
            const basketFrame = Math.min(basketTextures.length - 1, Math.floor(scoreRef.current / basketStep));
            if (playerSpriteRef.current.texture !== basketTextures[basketFrame]) {
                playerSpriteRef.current.texture = basketTextures[basketFrame];
            }
        }

        spawnTimer.current += frameTime;
        if (spawnTimer.current >= SPAWN_INTERVAL) {
            spawnTimer.current = 0;
            const nextApple = {
                id: nextAppleId.current++,
                type: pickAppleType(),
                x: treeOriginX + SPAWN_X_MIN + Math.random() * (SPAWN_X_MAX - SPAWN_X_MIN),
                y: treeOriginY + SPAWN_Y_MIN + Math.random() * (SPAWN_Y_MAX - SPAWN_Y_MIN),
                age: 0,
            } satisfies FallingApple;
            const sprite = new PixiSpriteClass(appleTextures[nextApple.type]);
            sprite.anchor.set(0.5);
            sprite.width = APPLE_SIZE * gameScale;
            sprite.height = APPLE_SIZE * gameScale;
            appleContainerRef.current?.addChild(sprite);
            applesRef.current.set(nextApple.id, { data: nextApple, sprite });
            playSound(SOUND_EFFECTS.spawn);
        }

        const playerBounds = { x: playerXRef.current, y: PLAYER_Y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };
        let scoreDelta = 0;
        let lifeDelta = 0;
        let lifeRecovered = false;
        let projectedLives = livesRef.current;
        applesRef.current.forEach((appleEntity) => {
            const apple = appleEntity.data;
            const appleType = APPLE_TYPES.find((candidate) => candidate.type === apple.type)!;
            apple.age += frameTime;
            const isSwinging = apple.age < APPLE_SWING_DURATION;
            const previousAppleY = apple.y;
            if (!isSwinging) {
                apple.y += appleType.fallingSpeed * delta;
            }
            const sprite = appleEntity.sprite;
            const swingProgress = Math.min(apple.age / APPLE_SWING_DURATION, 1);
            const swing = Math.sin(swingProgress * Math.PI * 6 + apple.id * 1.7) * 7 * (1 - swingProgress);
            sprite.x = gameOffset.x + (apple.x + swing) * gameScale;
            sprite.y = gameOffset.y + (apple.y + APPLE_SIZE / 2) * gameScale;
            sprite.rotation = Math.sin(swingProgress * Math.PI * 6 + apple.id * 1.7) * 0.24 * (1 - swingProgress);
            const crossedBasketTop = previousAppleY + APPLE_SIZE <= PLAYER_Y && apple.y + APPLE_SIZE >= PLAYER_Y;
            const canCollect = SIDEWAYS_COLLECTION || crossedBasketTop;
            if (canCollect && collides(playerBounds, { x: apple.x, y: apple.y, width: APPLE_SIZE, height: APPLE_SIZE })) {
                collectedApplesRef.current[apple.type]++;
                playSound(SOUND_EFFECTS[apple.type]);
                if (apple.type === "red") scoreDelta++;
                if (apple.type === "green") {
                    lifeDelta--;
                    projectedLives--;
                }
                if (apple.type === "golden") {
                    if (projectedLives < MAX_LIVES) {
                        lifeDelta++;
                        projectedLives++;
                        lifeRecovered = true;
                        const shineContainer = new PixiContainer();
                        const shineGraphics = new PixiGraphics();
                        shineGraphics.lineStyle(2, 0xfff4a3, 1);
                        for (let ray = 0; ray < 8; ray++) {
                            const angle = (Math.PI * 2 * ray) / 8;
                            shineGraphics.moveTo(Math.cos(angle) * 7, Math.sin(angle) * 7);
                            shineGraphics.lineTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
                        }
                        shineContainer.addChild(shineGraphics);
                        shineContainer.x = gameOffset.x + (apple.x + APPLE_SIZE / 2) * gameScale;
                        shineContainer.y = gameOffset.y + (apple.y + APPLE_SIZE / 2) * gameScale;
                        shineContainerRef.current?.addChild(shineContainer);
                        goldenShinesRef.current.set(apple.id, { age: 0, container: shineContainer });
                    }
                }
                removeApple(apple.id);
                return;
            }
            if (apple.y > logicalCanvasHeight) {
                if (apple.type === "red") {
                    lifeDelta--;
                    projectedLives--;
                    playSound(SOUND_EFFECTS.falls);
                }
                removeApple(apple.id);
            }
        });

        goldenShinesRef.current.forEach((shine, id) => {
            shine.age += frameTime;
            const progress = shine.age / GOLDEN_SHINE_DURATION;
            shine.container.alpha = 1 - progress;
            shine.container.scale.set((0.5 + progress) * gameScale);
            if (shine.age >= GOLDEN_SHINE_DURATION) removeShine(id);
        });
        if (scoreDelta) {
            scoreRef.current = mode === "classic" ? Math.min(50, scoreRef.current + scoreDelta) : scoreRef.current + scoreDelta;
            onScoreChange(scoreRef.current);
        }
        if (lifeDelta) {
            livesRef.current = Math.max(0, Math.min(MAX_LIVES, livesRef.current + lifeDelta));
            onLivesChange(livesRef.current);
            if (lifeRecovered) onLifeRecovered(livesRef.current);
        }
        if (!gameOverRef.current && (livesRef.current <= 0 || (mode === "classic" && scoreRef.current >= 50))) {
            gameOverRef.current = true;
            onGameOver(mode === "classic" && scoreRef.current >= 50 ? "victory" : "defeat", { ...collectedApplesRef.current });
        }
    });

    return <>
        <Container ref={appleContainerRef} />
        <Container ref={shineContainerRef} />
        <Sprite ref={playerSpriteRef} texture={basketTextures[0]} x={gameOffset.x + 120 * gameScale} y={gameOffset.y + PLAYER_Y * gameScale} width={PLAYER_SPRITE_SIZE * gameScale} height={PLAYER_SPRITE_SIZE * gameScale} />
    </>;
};
export const Experience = ({ isPlaying, isPaused, mode, onGameOver }: ExperienceProps) => {
    const [canvasSize, setCanvasSize] = useState(calculateCanvasSize);
    const gameScale = useMemo(() => calculateGameScale(canvasSize), [canvasSize]);
    const gameOffset = useMemo(() => calculateGameOffset(canvasSize, gameScale), [canvasSize, gameScale]);
    const [redAppleCount, setRedAppleCount] = useState(0);
    const [lives, setLives] = useState(MAX_LIVES);
    const [lifeRecoveryTrigger, setLifeRecoveryTrigger] = useState(0);
    const keysRef = useRef<Record<string, boolean>>({});
    const resizeFrameRef = useRef<number | null>(null);
    const updateCanvasSize = useCallback(() => {
        if (resizeFrameRef.current !== null) return;
        resizeFrameRef.current = window.requestAnimationFrame(() => {
            resizeFrameRef.current = null;
            setCanvasSize(calculateCanvasSize());
        });
    }, []);
    useEffect(() => {
        if (!isPlaying || isPaused) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            const isMovementKey = ["w", "a", "s", "d", "arrowup", 
                "arrowdown", "arrowleft", "arrowright"].includes(key);
            if (isMovementKey) {
                event.preventDefault();
            }
            keysRef.current[key] = true;
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            keysRef.current[key] = false;
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [isPaused, isPlaying]);
    useEffect(() => {
        window.addEventListener("resize", updateCanvasSize);
        return () => {
            window.removeEventListener("resize", updateCanvasSize);
            if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current);
        };
    }, [updateCanvasSize]);

    const setMovementKey = (key: "arrowleft" | "arrowright", pressed: boolean) => {
        keysRef.current[key] = pressed;
    };

    const releaseMovementKeys = () => {
        keysRef.current.arrowleft = false;
        keysRef.current.arrowright = false;
    };

    return (
        <>
            <Stage width={canvasSize.width} height={canvasSize.height}>
                <MainContainer canvasSize={canvasSize} redAppleCount={redAppleCount} mode={mode} lives={lives} lifeRecoveryTrigger={lifeRecoveryTrigger}>
                    <GameScene isPlaying={isPlaying} gameScale={gameScale} gameOffset={gameOffset} isPaused={isPaused} mode={mode} keysRef={keysRef} onScoreChange={setRedAppleCount} onLivesChange={setLives} onLifeRecovered={() => setLifeRecoveryTrigger((trigger) => trigger + 1)} onGameOver={onGameOver} />
                </MainContainer>
            </Stage>
            {isPlaying && !isPaused && (
                <div className="touch-controls" aria-label="Controles táctiles">
                    <button
                        className="touch-controls__button touch-controls__button--left"
                        type="button"
                        aria-label="Mover a la izquierda"
                        onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(event.pointerId);
                            event.preventDefault();
                            setMovementKey("arrowleft", true);
                        }}
                        onPointerUp={releaseMovementKeys}
                        onPointerCancel={releaseMovementKeys}
                        onLostPointerCapture={releaseMovementKeys}
                    >
                        <span aria-hidden="true">&#9664;</span>
                    </button>
                    <button
                        className="touch-controls__button touch-controls__button--right"
                        type="button"
                        aria-label="Mover a la derecha"
                        onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(event.pointerId);
                            event.preventDefault();
                            setMovementKey("arrowright", true);
                        }}
                        onPointerUp={releaseMovementKeys}
                        onPointerCancel={releaseMovementKeys}
                        onLostPointerCapture={releaseMovementKeys}
                    >
                        <span aria-hidden="true">&#9654;</span>
                    </button>
                </div>
            )}
        </>
    );
};
