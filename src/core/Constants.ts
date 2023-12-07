export interface Vector2 {
    x: number;
    y: number;
}

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export type Box = [number, number, number, number, number, number];

export interface Box2 {
    min: Vector2;
    max: Vector2;
}
