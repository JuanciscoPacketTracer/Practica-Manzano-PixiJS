import { Sprite, Stage, useTick } from "@pixi/react";
import { Texture } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import basketAsset from "../../assets/basket.bmp";
import { calculateCanvasSize, calculateGameScale } from "../../helpers/common";
import { MainContainer } from "./MainContainer/MainContainer";
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const PLAYER_SPEED = 3.5;
interface PlayerProps {
    canvasSize: { width: number; height: number };
    gameScale: number;
    keysRef: React.MutableRefObject<Record<string, boolean>>;
}
const Player = ({ canvasSize, gameScale, keysRef }: PlayerProps) => {
    const [playerPosition, setPlayerPosition] = useState({ x: 120, y: 220 });
    const playerTexture = useMemo(() => Texture.from(basketAsset), []);
    useTick((delta) => { 
        const moveAmount = PLAYER_SPEED * delta;
        let moveX = 0;
        if (keysRef.current.a || keysRef.current.arrowleft) moveX -= moveAmount;
        if (keysRef.current.d || keysRef.current.arrowright) moveX += moveAmount;
        if (moveX === 0) {
            return;
        }
        setPlayerPosition((previous) => {
            const canvasWidth = canvasSize.width / gameScale;
            const nextX = Math.max(0, Math.min(canvasWidth - PLAYER_WIDTH, previous.x + moveX));
            return { ...previous, x: nextX };
        });
    });
    return (
        <Sprite
            texture={playerTexture}
            x={playerPosition.x * gameScale}
            y={playerPosition.y * gameScale}
            width={PLAYER_WIDTH * gameScale}
            height={PLAYER_HEIGHT * gameScale}
            alpha={1}
        />
    );
};
export const Experience = () => {
    const [canvasSize, setCanvasSize] = useState(calculateCanvasSize);
    const gameScale = calculateGameScale(canvasSize);
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
            <MainContainer canvasSize={canvasSize}>
                <Player canvasSize={canvasSize} gameScale={gameScale} keysRef={keysRef} />
            </MainContainer>
        </Stage>
    );
};
