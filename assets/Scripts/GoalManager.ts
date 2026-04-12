import { _decorator, Component, Node, Vec2, v2, v3, tween, Sprite, SpriteFrame, Animation, AnimationClip } from 'cc';
import { GridPiece } from './GridPiece';
const { ccclass, property } = _decorator;

@ccclass('GoalManager')
export class GoalManager extends Component {
    @property(Sprite) outlineSprite: Sprite = null!;
    
    // The node that contains the Animation component for the characters
    @property(Animation) charAnimation: Animation = null!;
    
    @property([SpriteFrame]) outlineFrames: SpriteFrame[] = [];
    
    // Instead of Filled Frames, we now use Animation Clips
    @property([AnimationClip]) filledAnimations: AnimationClip[] = [];

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
            
            if (this.charAnimation) {
                this.charAnimation.node.active = false;
            }
            
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

    public checkPathMatch(playerChain: Node[], isLoopClosed: boolean): boolean {
        if (!isLoopClosed) return false;

        const targetPath = this.getPathForCurrentStage();
        const requiredColor = this.getRequiredColor();

        if (playerChain.length !== targetPath.length) return false;

        const validColor = playerChain.every(node => {
            const piece = node.getComponent(GridPiece);
            return piece && piece.colorId === requiredColor;
        });
        if (!validColor) return false;

        const playerCoords = playerChain.map(node => {
            const piece = node.getComponent(GridPiece)!;
            return v2(piece.row, piece.col);
        });

        return this.isCircularMatch(playerCoords, targetPath);
    }

    private isCircularMatch(playerPath: Vec2[], targetPath: Vec2[]): boolean {
        const len = targetPath.length;
        const comparePaths = (pathA: Vec2[], pathB: Vec2[]) => {
            for (let i = 0; i < len; i++) {
                if (pathA[i].x !== pathB[i].x || pathA[i].y !== pathB[i].y) return false;
            }
            return true;
        };

        for (let startOffset = 0; startOffset < len; startOffset++) {
            const shiftedTarget: Vec2[] = [];
            const reversedTarget: Vec2[] = [];
            for (let i = 0; i < len; i++) {
                shiftedTarget.push(targetPath[(startOffset + i) % len]);
                reversedTarget.push(targetPath[(startOffset - i + len) % len]);
            }
            if (comparePaths(playerPath, shiftedTarget) || comparePaths(playerPath, reversedTarget)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Now plays the animation clip instead of setting a sprite frame.
     */
    public revealCurrentDrawing() {
        if (this._currentStage < this.filledAnimations.length && this.charAnimation) {
            this.unschedule(this.hideOutline);
            this.outlineSprite.node.active = false;

            const targetClip = this.filledAnimations[this._currentStage];
            
            // Ensure the node is active to play animation
            this.charAnimation.node.active = true;
            this.charAnimation.node.setScale(v3(0, 0, 1));

            // Add the clip to the animation component if it's not already there and play
            const state = this.charAnimation.getState(targetClip.name) || this.charAnimation.addClip(targetClip);
            this.charAnimation.play(targetClip.name);

            tween(this.charAnimation.node)
                .to(0.4, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
    }

    public nextStage() {
        this._currentStage++;
    }
}