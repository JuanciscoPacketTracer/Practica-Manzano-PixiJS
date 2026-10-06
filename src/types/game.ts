export type AppleType = "red" | "green" | "golden";
export type GameMode = "classic" | "infinite";

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
    age: number;
}