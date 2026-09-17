import { Sprite, Stage, useTick } from "@pixi/react";
import { Texture } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import basketAsset from "../../assets/basket.bmp";
import { calculateCanvasSize } from "../../helpers/common";
import { MainContainer } from "./MainContainer/MainContainer";
const PLAYER_WIDTH = 100;
const PLAYER_HEIGHT = 60;
const PLAYER_SPEED = 4;
interface PlayerProps {
    canvasSize: { width: number; height: number };
    keysRef: React.MutableRefObject<Record<string, boolean>>;
}
const Player = ({ canvasSize, keysRef }: PlayerProps) => {
    const [playerPosition, setPlayerPosition] = useState({ x: 120, y: 120 });
    const playerTexture = useMemo(() => Texture.from(basketAsset), []);
    useTick((delta) => { 
        const moveAmount = PLAYER_SPEED * delta;
        let moveX = 0;
        let moveY = 0;
        if (keysRef.current.w || keysRef.current.arrowup) moveY -= moveAmount;
        if (keysRef.current.s || keysRef.current.arrowdown) moveY += moveAmount;
        if (keysRef.current.a || keysRef.current.arrowleft) moveX -= moveAmount;
        if (keysRef.current.d || keysRef.current.arrowright) moveX += moveAmount;
        if (moveX === 0 && moveY === 0) {
            return;
        }
        setPlayerPosition((previous) => {
            const nextX = Math.max(0, Math.min(canvasSize.width - PLAYER_WIDTH, previous.x + moveX));
            const nextY = Math.max(0, Math.min(canvasSize.height - PLAYER_HEIGHT, previous.y + moveY));
            return { x: nextX, y: nextY };
        });
    });
    return (
        <Sprite
            texture={playerTexture}
            x={playerPosition.x}
            y={playerPosition.y}
            width={PLAYER_WIDTH}
            height={PLAYER_HEIGHT}
            alpha={1}
        />
    );
};
export const Experience = () => {
    const [canvasSize, setCanvasSize] = useState(calculateCanvasSize);
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
                <Player canvasSize={canvasSize} keysRef={keysRef} />
            </MainContainer>
        </Stage>
    );
};
