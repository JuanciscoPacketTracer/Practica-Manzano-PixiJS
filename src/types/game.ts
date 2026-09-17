export type AppleType = "red" | "green" | "golden";

export interface FallingApple {
    id: number;
    type: AppleType;
    x: number;
    y: number;
}