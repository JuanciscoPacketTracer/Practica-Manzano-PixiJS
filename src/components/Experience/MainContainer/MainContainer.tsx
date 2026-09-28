import { Container, Graphics, Sprite, Text, useTick } from "@pixi/react";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Sprite as PixiSprite } from "pixi.js";
import { SCALE_MODES, TextStyle, Texture } from "pixi.js";
import apple0Asset from "../../../assets/images/apple_0.bmp";
import apple1Asset from "../../../assets/images/apple_1.bmp";
import apple2Asset from "../../../assets/images/apple_2.bmp";
import backgroundAsset from "../../../assets/images/backgroundgame.bmp";
import flowersAsset from "../../../assets/images/flowers.bmp";
import tree0Asset from "../../../assets/images/tree_0.bmp";
import tree1Asset from "../../../assets/images/tree_1.bmp";
import tree2Asset from "../../../assets/images/tree_2.bmp";
import tree3Asset from "../../../assets/images/tree_3.bmp";
import tree4Asset from "../../../assets/images/tree_4.bmp";
import tree5Asset from "../../../assets/images/tree_5.bmp";
import heart0Asset from "../../../assets/images/heart_0.bmp";
import heart1Asset from "../../../assets/images/heart_1.bmp";
import { calculateGameScale } from "../../../helpers/common";

interface IMainContainerProps {
    canvasSize: { width: number; height: number };
    redAppleCount: number;
    lives: number;
    lifeRecoveryTrigger: number;
}
const HUD_PADDING = 24;
const HUD_ICON_SIZE = 60;
const HEART_SHINE_DURATION = 0.7;
const HUD_TEXT_STYLE = new TextStyle({
    fill: 0xffffff,
    fontFamily: "Arial",
    fontSize: 26,
    fontWeight: "bold",
    stroke: 0x1d2b1d,
    strokeThickness: 4,
});
export const MainContainer = ({ canvasSize, redAppleCount, lives, lifeRecoveryTrigger, children }: PropsWithChildren<IMainContainerProps>) => {
    const textures = useMemo(() => {
        return [
            backgroundAsset,
            flowersAsset,
            tree0Asset,
            tree1Asset,
            tree2Asset,
            tree3Asset,
            tree4Asset,
            tree5Asset,
            apple0Asset,
            apple1Asset,
            apple2Asset,
            heart0Asset,
            heart1Asset,
        ].map((asset) => {
            const texture = Texture.from(asset);
            texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
            return texture;
        });
    }, []);
    const [backgroundTexture, flowersTexture, ...treeAndAppleTextures] = textures;
    const treeTextures = treeAndAppleTextures.slice(0, 6);
    const appleTextures = treeAndAppleTextures.slice(6, 9);
    const heartTextures = treeAndAppleTextures.slice(9, 11);
    const treeScale = calculateGameScale(canvasSize);
    const treeSize = 256 * treeScale;
    const treePosition = {
        x: Math.max(0, (canvasSize.width - treeSize) / 2),
        y: Math.max(0, (canvasSize.height - treeSize) / 2),
    };
    const treeSpritesRef = useRef<Array<PixiSprite | null>>([]);
    const treeTimeRef = useRef(0);
    const livesRef = useRef(lives);
    const heartShineRef = useRef({ age: HEART_SHINE_DURATION, slot: 0 });
    const [heartShine, setHeartShine] = useState({ age: HEART_SHINE_DURATION, slot: 0 });

    useEffect(() => {
        livesRef.current = lives;
    }, [lives]);

    useEffect(() => {
        if (lifeRecoveryTrigger === 0) return;
        heartShineRef.current = { age: 0, slot: Math.max(0, Math.min(2, livesRef.current - 1)) };
    }, [lifeRecoveryTrigger]);

    useTick((delta) => {
        treeTimeRef.current += delta / 60;
        treeSpritesRef.current.forEach((sprite, index) => {
            if (!sprite || index === 2) return;
            const sway = Math.sin(treeTimeRef.current * (1.35 + index * 0.17) + index * 1.9) * (1.5 + index * 0.25) * treeScale;
            sprite.x = treePosition.x + sway;
        });
        heartShineRef.current.age = Math.min(HEART_SHINE_DURATION, heartShineRef.current.age + delta / 60);
        setHeartShine({ ...heartShineRef.current });
    });
    return (
        <Container>
            <Sprite
                texture={backgroundTexture}
                width={canvasSize.width}
                height={canvasSize.height}
            />
            <Sprite
                texture={flowersTexture}
                width={canvasSize.width}
                height={canvasSize.height}
            />
            {treeTextures.map((texture, index) => (
                <Sprite
                    ref={(sprite) => { treeSpritesRef.current[index] = sprite; }}
                    key={`tree-${index}`}
                    texture={texture}
                    x={treePosition.x}
                    y={treePosition.y}
                    width={treeSize}
                    height={treeSize}
                />
            ))}
            <Container
                x={HUD_PADDING * treeScale}
                y={HUD_PADDING * treeScale}
                scale={(treeScale)/2}
            >
                <Text text={`${redAppleCount}/50`} style={HUD_TEXT_STYLE} />
                <Sprite
                    texture={appleTextures[0]}
                    x={70}
                    alpha={0.9}
                    anchor={{ x: 0, y: 0 }}
                    width={HUD_ICON_SIZE}
                    height={HUD_ICON_SIZE}
                />
            </Container>
            <Container
                x={canvasSize.width / 2}
                y={HUD_PADDING * treeScale}
                scale={(treeScale)/2}
            >
                {[0, 1, 2].map((lifeSlot) => (
                    <Sprite
                        key={`life-${lifeSlot}`}
                        texture={heartTextures[lifeSlot < lives ? 0 : 1]}
                        x={(lifeSlot - 1) * 70}
                        alpha={0.9}
                        anchor={{ x: 0.5, y: 0 }}
                        width={HUD_ICON_SIZE}
                        height={HUD_ICON_SIZE}
                    />
                ))}
            </Container>
            {heartShine.age < HEART_SHINE_DURATION && (
                <Container
                    x={canvasSize.width / 2 + (heartShine.slot - 1) * 70 * (treeScale / 2)}
                    y={HUD_PADDING * treeScale + HUD_ICON_SIZE * (treeScale / 2) / 2}
                    alpha={1 - heartShine.age / HEART_SHINE_DURATION}
                    scale={(0.9 + heartShine.age / HEART_SHINE_DURATION) * treeScale}
                >
                    <Graphics draw={(graphics) => {
                        graphics.clear();
                        graphics.lineStyle(3, 0xfff4a3, 1);
                        for (let ray = 0; ray < 10; ray++) {
                            const angle = (Math.PI * 2 * ray) / 10;
                            graphics.moveTo(Math.cos(angle) * 13, Math.sin(angle) * 13);
                            graphics.lineTo(Math.cos(angle) * 28, Math.sin(angle) * 28);
                        }
                    }} />
                </Container>
            )}
            {children}
        </Container>
    );
};