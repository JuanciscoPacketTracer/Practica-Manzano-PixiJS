import { Container, Graphics, Sprite, Stage, useTick } from "@pixi/react";
import { Texture } from "pixi.js";
import type { Sprite as PixiSprite } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import basketAsset from "../../assets/basket.bmp";
import apple0Asset from "../../assets/apple_0.bmp";
import apple1Asset from "../../assets/apple_1.bmp";
import apple2Asset from "../../assets/apple_2.bmp";
import { calculateCanvasSize, calculateGameScale } from "../../helpers/common";
import type { AppleType, CollectedApples, FallingApple } from "../../types/game";
import { MainContainer } from "./MainContainer/MainContainer";
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const PLAYER_Y = 220;
const PLAYER_SPEED = 3.5;
const APPLE_SIZE = 20;
const MAX_LIVES = 3;
const SPAWN_INTERVAL = 0.8;
const TREE_SIZE = 256;
const SPAWN_X_MIN = 30;
const SPAWN_X_MAX = 210;
const SPAWN_Y_MIN = 20;
const SPAWN_Y_MAX = 120;
const APPLE_SWING_DURATION = 1.5;
const GOLDEN_SHINE_DURATION = 0.95;
const APPLE_TYPES: { type: AppleType; spawnChance: number; fallingSpeed: number }[] = [
    { type: "red", spawnChance: 0.62, fallingSpeed: 2.2 },
    { type: "green", spawnChance: 0.31, fallingSpeed: 2.2 },
    { type: "golden", spawnChance: 0.07, fallingSpeed: 3.2 },
];

const pickAppleType = () => {
    const randomValue = Math.random();
    let chanceTotal = 0;
    for (const appleType of APPLE_TYPES) {
        chanceTotal += appleType.spawnChance;
        if (randomValue < chanceTotal) return appleType.type;
    }
    return "red" as const;
};

const collides = (first: { x: number; y: number; width: number; height: number }, second: typeof first) =>
    first.x < second.x + second.width && first.x + first.width > second.x &&
    first.y < second.y + second.height && first.y + first.height > second.y;

interface GameSceneProps {
    canvasSize: { width: number; height: number };
    gameScale: number;
    isPaused: boolean;
    keysRef: React.MutableRefObject<Record<string, boolean>>;
    onScoreChange: (score: number) => void;
    onLivesChange: (lives: number) => void;
    onLifeRecovered: (lives: number) => void;
    onGameOver: (result: "victory" | "defeat", collectedApples: CollectedApples) => void;
}

interface ExperienceProps {
    isPlaying: boolean;
    isPaused: boolean;
    onGameOver: (result: "victory" | "defeat", collectedApples: CollectedApples) => void;
}

const GameScene = ({ canvasSize, gameScale, isPaused, keysRef, onScoreChange, onLivesChange, onLifeRecovered, onGameOver }: GameSceneProps) => {
    const [apples, setApples] = useState<FallingApple[]>([]);
    const scoreRef = useRef(0);
    const livesRef = useRef(MAX_LIVES);
    const playerXRef = useRef(120);
    const playerSpriteRef = useRef<PixiSprite | null>(null);
    const appleSpritesRef = useRef<Record<number, PixiSprite | null>>({});
    const applesRef = useRef<FallingApple[]>([]);
    const spawnTimer = useRef(0);
    const nextAppleId = useRef(0);
    const collectedApplesRef = useRef<CollectedApples>({ red: 0, green: 0, golden: 0 });
    const goldenShinesRef = useRef<Array<{ id: number; x: number; y: number; age: number }>>([]);
    const [goldenShines, setGoldenShines] = useState<Array<{ id: number; x: number; y: number; age: number }>>([]);
    const gameOverRef = useRef(false);
    const playerTexture = useMemo(() => Texture.from(basketAsset), []);
    const appleTextures = useMemo(() => ({
        red: Texture.from(apple0Asset),
        green: Texture.from(apple1Asset),
        golden: Texture.from(apple2Asset),
    }), []);
    const logicalCanvasWidth = canvasSize.width / gameScale;
    const logicalCanvasHeight = canvasSize.height / gameScale;
    const treeOriginX = Math.max(0, (logicalCanvasWidth - TREE_SIZE) / 2);
    const treeOriginY = Math.max(0, (logicalCanvasHeight - TREE_SIZE) / 2);

    useEffect(() => {
        applesRef.current = apples;
    }, [apples]);

    useTick((delta) => {
        if (isPaused || livesRef.current <= 0 || scoreRef.current >= 50) return;
        const frameTime = delta / 60;
        const moveAmount = PLAYER_SPEED * delta;
        if (keysRef.current.a || keysRef.current.arrowleft) playerXRef.current -= moveAmount;
        if (keysRef.current.d || keysRef.current.arrowright) playerXRef.current += moveAmount;
        playerXRef.current = Math.max(0, Math.min(logicalCanvasWidth - PLAYER_WIDTH, playerXRef.current));
        if (playerSpriteRef.current) {
            playerSpriteRef.current.x = playerXRef.current * gameScale;
            playerSpriteRef.current.y = PLAYER_Y * gameScale;
            playerSpriteRef.current.width = PLAYER_WIDTH * gameScale;
            playerSpriteRef.current.height = PLAYER_HEIGHT * gameScale;
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
            applesRef.current = [...applesRef.current, nextApple];
            setApples(applesRef.current);
        }

        const playerBounds = { x: playerXRef.current, y: PLAYER_Y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };
        let scoreDelta = 0;
        let lifeDelta = 0;
        let lifeRecovered = false;
        let projectedLives = livesRef.current;
        const remainingApples = applesRef.current.filter((apple) => {
            const appleType = APPLE_TYPES.find((candidate) => candidate.type === apple.type)!;
            apple.age += frameTime;
            const isSwinging = apple.age < APPLE_SWING_DURATION;
            if (!isSwinging) {
                apple.y += appleType.fallingSpeed * delta;
            }
            const sprite = appleSpritesRef.current[apple.id];
            if (sprite) {
                const swingProgress = Math.min(apple.age / APPLE_SWING_DURATION, 1);
                const swing = Math.sin(swingProgress * Math.PI * 6 + apple.id * 1.7) * 7 * (1 - swingProgress);
                sprite.x = (apple.x + swing) * gameScale;
                sprite.y = apple.y * gameScale;
                sprite.rotation = Math.sin(swingProgress * Math.PI * 6 + apple.id * 1.7) * 0.24 * (1 - swingProgress);
            }
            if (collides(playerBounds, { x: apple.x, y: apple.y, width: APPLE_SIZE, height: APPLE_SIZE })) {
                collectedApplesRef.current[apple.type]++;
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
                        goldenShinesRef.current.push({ id: apple.id, x: apple.x, y: apple.y, age: 0 });
                    }
                }
                delete appleSpritesRef.current[apple.id];
                return false;
            }
            if (apple.y > logicalCanvasHeight) {
                if (apple.type === "red") {
                    lifeDelta--;
                    projectedLives--;
                }
                delete appleSpritesRef.current[apple.id];
                return false;
            }
            return true;
        });

        goldenShinesRef.current = goldenShinesRef.current.filter((shine) => {
            shine.age += frameTime;
            return shine.age < GOLDEN_SHINE_DURATION;
        });
        setGoldenShines([...goldenShinesRef.current]);

        if (remainingApples.length !== applesRef.current.length) {
            applesRef.current = remainingApples;
            setApples(remainingApples);
        }
        if (scoreDelta) {
            scoreRef.current = Math.min(50, scoreRef.current + scoreDelta);
            onScoreChange(scoreRef.current);
        }
        if (lifeDelta) {
            livesRef.current = Math.max(0, Math.min(MAX_LIVES, livesRef.current + lifeDelta));
            onLivesChange(livesRef.current);
            if (lifeRecovered) onLifeRecovered(livesRef.current);
        }
        if (!gameOverRef.current && (scoreRef.current >= 50 || livesRef.current <= 0)) {
            gameOverRef.current = true;
            onGameOver(scoreRef.current >= 50 ? "victory" : "defeat", { ...collectedApplesRef.current });
        }
    });

    return <>
        <Sprite ref={playerSpriteRef} texture={playerTexture} x={120 * gameScale} y={PLAYER_Y * gameScale} width={PLAYER_WIDTH * gameScale} height={PLAYER_HEIGHT * gameScale} />
        {apples.map((apple) => <Sprite anchor={0.5} ref={(sprite) => { appleSpritesRef.current[apple.id] = sprite; }} key={apple.id} texture={appleTextures[apple.type]} x={(apple.x + APPLE_SIZE / 2) * gameScale} y={(apple.y + APPLE_SIZE / 2) * gameScale} width={APPLE_SIZE * gameScale} height={APPLE_SIZE * gameScale} />)}
        {goldenShines.map((shine) => {
            const progress = shine.age / GOLDEN_SHINE_DURATION;
            return <Container key={`shine-${shine.id}`} x={(shine.x + APPLE_SIZE / 2) * gameScale} y={(shine.y + APPLE_SIZE / 2) * gameScale} alpha={1 - progress} scale={(0.5 + progress) * gameScale}>
                <Graphics draw={(graphics) => {
                    graphics.clear();
                    graphics.lineStyle(2, 0xfff4a3, 1);
                    for (let ray = 0; ray < 8; ray++) {
                        const angle = (Math.PI * 2 * ray) / 8;
                        graphics.moveTo(Math.cos(angle) * 7, Math.sin(angle) * 7);
                        graphics.lineTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
                    }
                }} />
            </Container>;
        })}
    </>;
};
export const Experience = ({ isPlaying, isPaused, onGameOver }: ExperienceProps) => {
    const [canvasSize, setCanvasSize] = useState(calculateCanvasSize);
    const gameScale = calculateGameScale(canvasSize);
    const [redAppleCount, setRedAppleCount] = useState(0);
    const [lives, setLives] = useState(MAX_LIVES);
    const [lifeRecoveryTrigger, setLifeRecoveryTrigger] = useState(0);
    const keysRef = useRef<Record<string, boolean>>({});
    const updateCanvasSize = useCallback(() => {
        setCanvasSize(calculateCanvasSize());
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
        return () => window.removeEventListener("resize", updateCanvasSize);
    }, [updateCanvasSize]);
    return (
        <Stage width={canvasSize.width} height={canvasSize.height}>
            <MainContainer canvasSize={canvasSize} redAppleCount={redAppleCount} lives={lives} lifeRecoveryTrigger={lifeRecoveryTrigger}>
                {isPlaying && (
                    <GameScene canvasSize={canvasSize} gameScale={gameScale} isPaused={isPaused} keysRef={keysRef} onScoreChange={setRedAppleCount} onLivesChange={setLives} onLifeRecovered={() => setLifeRecoveryTrigger((trigger) => trigger + 1)} onGameOver={onGameOver} />
                )}
            </MainContainer>
        </Stage>
    );
};
