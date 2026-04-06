import { _decorator, Component, Node, Label, Vec2, v2, v3, tween, ProgressBar } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GoalManager')
export class GoalManager extends Component {
    @property([Node]) drawingSlots: Node[] = []; 
    @property(ProgressBar) progressBar: ProgressBar = null!;
    @property(Label) progressLabel: Label = null!;

    private readonly stageColors: string[] = ["blue", "yellow", "green"];
    private _currentStage: number = 0;

    private readonly stagePaths: Vec2[][] = [
        [ // Stage 0: Cat (Blue)
            v2(0,0), v2(1, 0), v2(2, 0), v2(3, 0), v2(4, 0), v2(5, 0), v2(6, 0),
            v2(7,1), 
            v2(8, 2), v2(8, 3), v2(8, 4), v2(8, 5), v2(8, 6), 
            v2(7,7),   
            v2(6, 8), v2(5, 8), v2(4, 8), v2(3, 8), v2(2, 8), v2(0, 8),
            v2(1, 8), v2(2, 6), v2(3, 3), v2(3, 4), v2(3, 5), v2(2, 2), v2(1,7), v2(1, 1)
        ],

        [ // Stage 2: Home (Green)
            v2(0,4), v2(1,3), v2(2,2), v2(3,1), v2(4,1), v2(5,1), v2(6,1), v2(7,1), v2(8,1), v2(8,2), v2(8,3), v2(8,4), v2(8,5), v2(8,6), v2(8,7), v2(7,7), v2(6,7), v2(5,7), v2(4,7), v2(3,7), v2(1,5), v2(2,6)
        ],

        [ // Stage 1: Star (Yellow)
     v2(1,4), v2(3,5), v2(3,6), v2(3,7), v2(5,5), v2(8,7), v2(7,4), v2(8,1), v2(5,3), v2(4,2), v2(3,1), v2(3,2), v2(3,3)
        ]

    ];

    public get currentStage(): number { return this._currentStage; }

    public getPathForCurrentStage(): Vec2[] {
        return this.stagePaths[this._currentStage] || [];
    }

    public getRequiredColor(): string {
        return this.stageColors[this._currentStage] || "";
    }

    public updateProgressUI(current: number, target: number) {
        const ratio = Math.min(current / target, 1);
        if (this.progressBar) this.progressBar.progress = ratio;
        if (this.progressLabel) this.progressLabel.string = `${Math.floor(ratio * 100)}%`;
    }

    public checkPathMatch(playerChain: Node[]): boolean {
        const targetPath = this.getPathForCurrentStage();
        const requiredColor = this.getRequiredColor();
        
        let shapeMatches = 0;
        playerChain.forEach(node => {
            const piece = node.getComponent('GridPiece') as any;
            if (piece && piece.colorId === requiredColor) {
                if (targetPath.some(t => t.x === piece.row && t.y === piece.col)) {
                    shapeMatches++;
                }
            }
        });

        // Validation: Must be the right color and at least 5 points of the shape connected
        return shapeMatches >= 5; 
    }

    public revealCurrentDrawing() {
        console.log(`PROGRESSED: Stage ${this._currentStage} (${this.getRequiredColor()}) complete.`);
        const node = this.drawingSlots[this._currentStage];
        if (node) {
            node.active = true;
            node.setScale(v3(0, 0, 1));
            tween(node)
                .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
        this._currentStage++;
    }
}