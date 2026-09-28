export const GAME_SIZE = 256;

export const calculateCanvasSize = () => {
       const width = window.innerWidth;
       const height = window.innerHeight;
       return { width, height };
};

export const calculateGameScale = (canvasSize: { width: number; height: number }) =>
       Math.min(canvasSize.width, canvasSize.height) / GAME_SIZE;

export const calculateGameOffset = (canvasSize: { width: number; height: number }, gameScale: number) => ({
       x: (canvasSize.width - GAME_SIZE * gameScale) / 2,
       y: (canvasSize.height - GAME_SIZE * gameScale) / 2,
});
