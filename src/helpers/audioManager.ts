export interface AudioEffect {
    source: string;
    volume: number;
}

const MAX_EFFECT_VOICES = 3;
const effectPools = new Map<string, HTMLAudioElement[]>();
const musicAudio = new Audio();
let currentMusicSource: string | null = null;

musicAudio.loop = true;
musicAudio.preload = "auto";

const getEffectPool = (source: string) => {
    const existingPool = effectPools.get(source);
    if (existingPool) return existingPool;

    const pool = Array.from({ length: MAX_EFFECT_VOICES }, () => {
        const audio = new Audio(source);
        audio.preload = "auto";
        return audio;
    });
    effectPools.set(source, pool);
    return pool;
};

export const playEffect = ({ source, volume }: AudioEffect) => {
    const audio = getEffectPool(source).find((candidate) => candidate.paused || candidate.ended);
    if (!audio) return;

    audio.volume = volume;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
};

export const syncMusic = (source: string, volume: number) => {
    if (currentMusicSource !== source) {
        musicAudio.src = source;
        musicAudio.currentTime = 0;
        currentMusicSource = source;
    }

    musicAudio.volume = volume;
    if (musicAudio.paused) {
        return musicAudio.play().catch(() => undefined);
    }

    return Promise.resolve();
};

export const unlockMusic = (source: string, volume: number) => {
    return syncMusic(source, volume);
};
