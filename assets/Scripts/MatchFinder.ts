import { GridPiece } from './GridPiece';

export class MatchFinder {
    /**
     * Checks if two dots share the same colorId, regardless of grid position.
     */
    public static isSameColor(p1: GridPiece, p2: GridPiece): boolean {
        // We only care if the colors are identical
        return p1.colorId === p2.colorId;
    }
}