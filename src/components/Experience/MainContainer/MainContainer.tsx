import { Container, Sprite, Text } from "@pixi/react";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { SCALE_MODES, TextStyle, Texture } from "pixi.js";
import apple0Asset from "../../../assets/apple_0.bmp";
import apple1Asset from "../../../assets/apple_1.bmp";
import backgroundAsset from "../../../assets/backgroundgame.bmp";
import flowersAsset from "../../../assets/flowers.bmp";
import tree0Asset from "../../../assets/tree_0.bmp";
import tree1Asset from "../../../assets/tree_1.bmp";
import tree2Asset from "../../../assets/tree_2.bmp";
import tree3Asset from "../../../assets/tree_3.bmp";
import tree4Asset from "../../../assets/tree_4.bmp";
import tree5Asset from "../../../assets/tree_5.bmp";
import { calculateGameScale } from "../../../helpers/common";

interface IMainContainerProps {
    canvasSize: { width: number; height: number };
}
const HUD_PADDING = 24;
const HUD_ICON_SIZE = 60;
const HUD_TEXT_STYLE = new TextStyle({
    fill: 0xffffff,
    fontFamily: "Arial",
    fontSize: 26,
    fontWeight: "bold",
    stroke: 0x1d2b1d,
    strokeThickness: 4,
});
export const MainContainer = ({ canvasSize, children }: PropsWithChildren<IMainContainerProps>) => {
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
        ].map((asset) => {
            const texture = Texture.from(asset);
            texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
            return texture;
        });
    }, []);
    const [backgroundTexture, flowersTexture, ...treeAndAppleTextures] = textures;
    const treeTextures = treeAndAppleTextures.slice(0, 6);
    const appleTextures = treeAndAppleTextures.slice(6, 8);
    const treeScale = calculateGameScale(canvasSize);
    const treeSize = 256 * treeScale;
    const treePosition = {
        x: Math.max(0, (canvasSize.width - treeSize) / 2),
        y: Math.max(0, (canvasSize.height - treeSize) / 2),
    };
    const applePositions = [
        // red apples
        { x: 62, y: 78, type: 0 },
        { x: 92, y: 28, type: 0 },
        { x: 22, y: 200, type: 0 },
        { x: 154, y: 68, type: 0 },
        { x: 182, y: 170, type: 0 },
        { x: 138, y: 118, type: 0 },
        // green apples
        { x: 34, y: 116, type: 1 },
        //{ x: 102, y: 164, type: 1 },
       // { x: 14, y: 20, type: 1 },
        { x: 188, y: 24, type: 1 },
    ];

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
                    key={`tree-${index}`}
                    texture={texture}
                    x={treePosition.x}
                    y={treePosition.y}
                    width={treeSize}
                    height={treeSize}
                />
            ))}
            {applePositions.map((position, index) => (
                <Sprite
                    key={`apple-${index}`}
                    texture={appleTextures[position.type] ?? appleTextures[0]}
                    x={treePosition.x + position.x * treeScale}
                    y={treePosition.y + position.y * treeScale}
                    width={20 * treeScale}
                    height={20 * treeScale}
                />
            ))}
            <Container
                x={HUD_PADDING * treeScale}
                y={HUD_PADDING * treeScale}
                scale={(treeScale)/2}
            >
                <Text text="0/50" style={HUD_TEXT_STYLE} />
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
                x={canvasSize.width - HUD_PADDING * treeScale}
                y={HUD_PADDING * treeScale}
                scale={(treeScale)/2}
            >
                <Text
                    text="0/3"
                    style={HUD_TEXT_STYLE}
                    x={-70}
                    anchor={{ x: 1, y: 0 }}
                />
                <Sprite
                    texture={appleTextures[1]}
                    x={0}
                    alpha={0.9}
                    anchor={{ x: 1, y: 0 }}
                    width={HUD_ICON_SIZE}
                    height={HUD_ICON_SIZE}
                />
            </Container>
            {children}
        </Container>
    );
};