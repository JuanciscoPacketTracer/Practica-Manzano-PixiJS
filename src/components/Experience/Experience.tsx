import { Sprite, Stage, useTick } from "@pixi/react";
import { Texture } from "pixi.js";
import type { Sprite as PixiSprite } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import basketAsset from "../../assets/basket.bmp";
import apple0Asset from "../../assets/apple_0.bmp";
import apple1Asset from "../../assets/apple_1.bmp";
import apple2Asset from "../../assets/apple_2.bmp";
import { calculateCanvasSize, calculateGameScale } from "../../helpers/common";
import type { AppleType, FallingApple } from "../../types/game";
import { MainContainer } from "./MainContainer/MainContainer";
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const PLAYER_Y = 220;
const PLAYER_SPEED = 3.5;
const APPLE_SIZE = 20;
const MAX_LIVES = 3;
const SPAWN_INTERVAL = 0.8;
const TREE_SIZE = 256;
const SPAWN_X_MIN = 60;
const SPAWN_X_MAX = 190;
const SPAWN_Y_MIN = 10;
const SPAWN_Y_MAX = 110;
const APPLE_TYPES: { type: AppleType; spawnChance: number; fallingSpeed: number }[] = [
    { type: "red", spawnChance: 0.72, fallingSpeed: 2.2 },
    { type: "green", spawnChance: 0.21, fallingSpeed: 2.6 },
    { type: "golden", spawnChance: 0.07, fallingSpeed: 1.8 },
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
    keysRef: React.MutableRefObject<Record<string, boolean>>;
    onScoreChange: (score: number) => void;
    onLivesChange: (lives: number) => void;
}

const GameScene = ({ canvasSize, gameScale, keysRef, onScoreChange, onLivesChange }: GameSceneProps) => {
    const [apples, setApples] = useState<FallingApple[]>([]);
    const scoreRef = useRef(0);
    const livesRef = useRef(MAX_LIVES);
    const playerXRef = useRef(120);
    const playerSpriteRef = useRef<PixiSprite | null>(null);
    const appleSpritesRef = useRef<Record<number, PixiSprite | null>>({});
    const applesRef = useRef<FallingApple[]>([]);
    const spawnTimer = useRef(0);
    const nextAppleId = useRef(0);
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
        if (livesRef.current <= 0 || scoreRef.current >= 50) return;
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
            } satisfies FallingApple;
            applesRef.current = [...applesRef.current, nextApple];
            setApples(applesRef.current);
        }

        const playerBounds = { x: playerXRef.current, y: PLAYER_Y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };
        let scoreDelta = 0;
        let lifeDelta = 0;
        const remainingApples = applesRef.current.filter((apple) => {
            const appleType = APPLE_TYPES.find((candidate) => candidate.type === apple.type)!;
            apple.y += appleType.fallingSpeed * delta;
            const sprite = appleSpritesRef.current[apple.id];
            if (sprite) {
                sprite.x = apple.x * gameScale;
                sprite.y = apple.y * gameScale;
            }
            if (collides(playerBounds, { x: apple.x, y: apple.y, width: APPLE_SIZE, height: APPLE_SIZE })) {
                if (apple.type === "red") scoreDelta++;
                if (apple.type === "green") {
                    lifeDelta--;
                }
                if (apple.type === "golden") lifeDelta++;
                delete appleSpritesRef.current[apple.id];
                return false;
            }
            if (apple.y > logicalCanvasHeight) {
                if (apple.type === "red") lifeDelta--;
                delete appleSpritesRef.current[apple.id];
                return false;
            }
            return true;
        });

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
        }
    });

    return <>
        <Sprite ref={playerSpriteRef} texture={playerTexture} x={120 * gameScale} y={PLAYER_Y * gameScale} width={PLAYER_WIDTH * gameScale} height={PLAYER_HEIGHT * gameScale} />
        {apples.map((apple) => <Sprite ref={(sprite) => { appleSpritesRef.current[apple.id] = sprite; }} key={apple.id} texture={appleTextures[apple.type]} x={apple.x * gameScale} y={apple.y * gameScale} width={APPLE_SIZE * gameScale} height={APPLE_SIZE * gameScale} />)}
    </>;
};
export const Experience = () => {
    const [canvasSize, setCanvasSize] = useState(calculateCanvasSize);
    const gameScale = calculateGameScale(canvasSize);
    const [redAppleCount, setRedAppleCount] = useState(0);
    const [lives, setLives] = useState(MAX_LIVES);
    const keysRef = useRef<Record<string, boolean>>({});
    const updateCanvasSize = useCallback(() => {
        setCanvasSize(calculateCanvasSize());
    }, []);
    useEffect(() => {
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
    }, []);
    useEffect(() => {
        window.addEventListener("resize", updateCanvasSize);
        return () => window.removeEventListener("resize", updateCanvasSize);
    }, [updateCanvasSize]);
    return (
        <Stage width={canvasSize.width} height={canvasSize.height}>
            <MainContainer canvasSize={canvasSize} redAppleCount={redAppleCount} lives={lives}>
                <GameScene canvasSize={canvasSize} gameScale={gameScale} keysRef={keysRef} onScoreChange={setRedAppleCount} onLivesChange={setLives} />
            </MainContainer>
        </Stage>
    );
};
