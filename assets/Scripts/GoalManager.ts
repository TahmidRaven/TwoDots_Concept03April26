import { _decorator, Component, Node, Label, Vec2, v2, v3, tween, ProgressBar } from 'cc';
import { GridPiece } from './GridPiece';
const { ccclass, property } = _decorator;

@ccclass('GoalManager')
export class GoalManager extends Component {
    @property([Node]) drawingSlots: Node[] = []; 
    @property(ProgressBar) progressBar: ProgressBar = null!;
    @property(Label) progressLabel: Label = null!;

    private readonly stageColors: string[] = ["blue", "green", "yellow"];
    private _currentStage: number = 0;

    private readonly stagePaths: Vec2[][] = [
        [ // Stage 0: Cat (Blue)
            v2(0,0), v2(1, 0), v2(2, 0), v2(3, 0), v2(4, 0), v2(5, 0), v2(6, 0), v2(7,1), v2(8, 2), v2(8, 3), v2(8, 4), v2(8, 5), v2(8, 6), v2(7,7), v2(6, 8), v2(5, 8), v2(4, 8), v2(3, 8), v2(2, 8), v2(1, 8), v2(0, 8), v2(1,7), v2(2, 6), v2(3, 5), v2(3, 4), v2(3, 3), v2(2, 2), v2(1, 1)
        ],
        [ // Stage 1: Home (Green)
            v2(0,4), v2(1,3), v2(2,2), v2(3,1), v2(4,1), v2(5,1), v2(6,1), v2(7,1), v2(8,1), v2(8,2), v2(8,3), v2(8,4), v2(8,5), v2(8,6), v2(8,7), v2(7,7), v2(6,7), v2(5,7), v2(4,7), v2(3,7), v2(2,6), v2(1,5)
        ],
        [ // Stage 2: Star (Yellow)
            v2(1,4), v2(3,5), v2(3,6), v2(3,7), v2(4,6), v2(5,5), v2(7,6), v2(6,4), v2(7,2), v2(5,3), v2(4,2), v2(3,1), v2(3,2), v2(3,3)
        ]
    ];

    public get currentStage(): number { return this._currentStage; }
    public getPathForCurrentStage(): Vec2[] { return this.stagePaths[this._currentStage] || []; }
    public getRequiredColor(): string { return this.stageColors[this._currentStage] || ""; }

    public checkPathMatch(playerChain: Node[], isLoopClosed: boolean): boolean {
        if (!isLoopClosed) return false;

        const targetPath = this.getPathForCurrentStage();
        const requiredColor = this.getRequiredColor();

        // 1. Check if the player chain contains ONLY the required color
        const validColor = playerChain.every(node => {
            const piece = node.getComponent(GridPiece);
            return piece && piece.colorId === requiredColor;
        });
        if (!validColor) return false;

        // 2. Check if every dot in the target shape was touched
        // We use a "Set" style check to ensure all coordinates in targetPath exist in playerChain
        const allPointsMatched = targetPath.every(targetPos => {
            return playerChain.some(node => {
                const piece = node.getComponent(GridPiece);
                return piece && piece.row === targetPos.x && piece.col === targetPos.y;
            });
        });

        // 3. Double check that the player didn't select extra dots outside the shape
        const noExtraPoints = playerChain.every(node => {
            const piece = node.getComponent(GridPiece);
            return piece && targetPath.some(targetPos => targetPos.x === piece.row && targetPos.y === piece.col);
        });

        if (!allPointsMatched || !noExtraPoints) {
            console.warn(`[GoalManager] Shape mismatch. Required: ${targetPath.length}, Player: ${playerChain.length}`);
            return false;
        }

        return true; 
    }

    public revealCurrentDrawing() {
        const node = this.drawingSlots[this._currentStage];
        if (node) {
            node.active = true;
            node.setScale(v3(0, 0, 1));
            tween(node).to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
        }
        this._currentStage++;
    }
}