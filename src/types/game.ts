export type AppleType = "red" | "green" | "golden";

export interface CollectedApples {
    red: number;
    green: number;
    golden: number;
}

export interface FallingApple {
    id: number;
    type: AppleType;
    x: number;
    y: number;
}