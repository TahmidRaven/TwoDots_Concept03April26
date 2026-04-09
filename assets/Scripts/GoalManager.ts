import { _decorator, Component, Node, Vec2, v2, v3, tween, Sprite, SpriteFrame } from 'cc';
import { GridPiece } from './GridPiece';
const { ccclass, property } = _decorator;

@ccclass('GoalManager')
export class GoalManager extends Component {
    @property(Sprite) outlineSprite: Sprite = null!;
    @property(Sprite) filledSprite: Sprite = null!;
    
    @property([SpriteFrame]) outlineFrames: SpriteFrame[] = [];
    @property([SpriteFrame]) filledFrames: SpriteFrame[] = [];

    private readonly stageColors: string[] = ["blue", "red", "yellow"];
    private _currentStage: number = 0;

    private readonly stagePaths: Vec2[][] = [
        [ // Stage 0: Cat (Blue)
            v2(1, 1), v2(2, 1), v2(3, 1), v2(4, 1), v2(5, 1), v2(6, 1), v2(7,2), v2(7, 3), v2(7, 4), v2(7, 5), v2(7, 6), v2(6,7), v2(5, 7), v2(4, 7), v2(3, 7), v2(2, 7), v2(1, 7), v2(2, 6), v2(3, 5), v2(3, 4), v2(3, 3), v2(2, 2)
        ],
        [ // Stage 1: Home (Red)
            v2(1,4), v2(2,3), v2(3,2), v2(4,1), v2(5,1), v2(6,1), v2(7,1), v2(7,2), v2(7,3), v2(7,4), v2(7,5), v2(7,6), v2(7,7), v2(6,7), v2(5,7), v2(4,7), v2(3,6), v2(2,5)
        ],
        [ // Stage 2: Star (Yellow)
            v2(1,4), v2(3,5), v2(3,6), v2(3,7), v2(4,6), v2(5,5), v2(7,6), v2(6,4), v2(7,2), v2(5,3), v2(4,2), v2(3,1), v2(3,2), v2(3,3)
        ]
    ];

    public get currentStage(): number { return this._currentStage; }
    public getPathForCurrentStage(): Vec2[] { return this.stagePaths[this._currentStage] || []; }
    public getRequiredColor(): string { return this.stageColors[this._currentStage] || ""; }

    start() {
        this.updateStageVisuals();
    }

    public updateStageVisuals() {
        if (this._currentStage < this.outlineFrames.length) {
            this.outlineSprite.spriteFrame = this.outlineFrames[this._currentStage];
            this.outlineSprite.node.active = false; 
            this.filledSprite.node.active = false;
            this.outlineSprite.node.setScale(v3(1, 1, 1));
        }
    }

    public flashOutline(duration: number = 0.8) {
        if (!this.outlineSprite) return;
        this.outlineSprite.node.active = true;
        this.unschedule(this.hideOutline);
        this.scheduleOnce(this.hideOutline, duration);
    }

    private hideOutline() {
        if (this.outlineSprite) this.outlineSprite.node.active = false;
    }

    /**
     * Updated checkPathMatch: Validates color, length, and strict coordinate sequence.
     */
    public checkPathMatch(playerChain: Node[], isLoopClosed: boolean): boolean {
        if (!isLoopClosed) return false;

        const targetPath = this.getPathForCurrentStage();
        const requiredColor = this.getRequiredColor();

        // 1. Length and Color Validation
        if (playerChain.length !== targetPath.length) return false;

        const validColor = playerChain.every(node => {
            const piece = node.getComponent(GridPiece);
            return piece && piece.colorId === requiredColor;
        });
        if (!validColor) return false;

        // 2. Map Nodes to Coordinates
        const playerCoords = playerChain.map(node => {
            const piece = node.getComponent(GridPiece)!;
            return v2(piece.row, piece.col);
        });

        // 3. Circular Sequence Validation
        return this.isCircularMatch(playerCoords, targetPath);
    }

    /**
     * Checks if the player's path matches the target path in order, 
     * accounting for starting at different points or drawing in reverse.
     */
    private isCircularMatch(playerPath: Vec2[], targetPath: Vec2[]): boolean {
        const len = targetPath.length;

        const comparePaths = (pathA: Vec2[], pathB: Vec2[]) => {
            for (let i = 0; i < len; i++) {
                if (pathA[i].x !== pathB[i].x || pathA[i].y !== pathB[i].y) return false;
            }
            return true;
        };

        // Try every possible start point on the target path
        for (let startOffset = 0; startOffset < len; startOffset++) {
            const shiftedTarget: Vec2[] = [];
            const reversedTarget: Vec2[] = [];

            for (let i = 0; i < len; i++) {
                // Forward check
                shiftedTarget.push(targetPath[(startOffset + i) % len]);
                // Backward/Reverse check
                reversedTarget.push(targetPath[(startOffset - i + len) % len]);
            }

            if (comparePaths(playerPath, shiftedTarget) || comparePaths(playerPath, reversedTarget)) {
                return true;
            }
        }

        return false;
    }

    public revealCurrentDrawing() {
        if (this._currentStage < this.filledFrames.length) {
            this.unschedule(this.hideOutline);
            this.outlineSprite.node.active = false;
            this.filledSprite.spriteFrame = this.filledFrames[this._currentStage];
            this.filledSprite.node.active = true;
            this.filledSprite.node.setScale(v3(0, 0, 1));
            tween(this.filledSprite.node)
                .to(0.4, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
    }

    public nextStage() {
        this._currentStage++;
    }
}