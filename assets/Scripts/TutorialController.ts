import { _decorator, Component, Node, Vec3, v3, Vec2, tween, Tween, CCFloat } from 'cc';
import { GridController } from './GridController';
import { GameManager } from './GameManager';
import { TutorialHand } from './TutorialHand';

const { ccclass, property } = _decorator;

@ccclass('TutorialController')
export class TutorialController extends Component {
    @property(TutorialHand) hand: TutorialHand = null!;
    @property(GridController) grid: GridController = null!;
    
    @property({ type: CCFloat, tooltip: "Seconds to move between each dot" })
    public drawSpeed: number = 0.4;

    @property({ type: CCFloat, tooltip: "Idle time before tutorial triggers" })
    public idleThreshold: number = 3.0;

    private _idleTimer: number = 0;
    private _isShowingTutorial: boolean = false;
    private _tutorialTween: Tween<Node> | null = null;

    update(dt: number) {
        // Don't count idle time if game is over or board is busy dropping dots
        if (GameManager.instance.isGameOver || this.grid.isProcessing) {
            this._idleTimer = 0;
            return;
        }

        this._idleTimer += dt;

        if (this._idleTimer >= this.idleThreshold && !this._isShowingTutorial) {
            this.playFullSuggestion();
        }
    }

public playFullSuggestion() {
        const gm = GameManager.instance.goalManager;
        const path: Vec2[] = gm.getPathForCurrentStage();
        if (path.length < 2) return;

        this._isShowingTutorial = true;
        const goalColor = gm.getRequiredColor();
        const colorHex = (this.grid as any).colorMap[goalColor] || "#FFFFFF";

        // Start at first position
        const startPos = this.grid.getPosOfCell(path[0].x, path[0].y);
        this.hand.node.setPosition(startPos);
        this.hand.showAt(startPos);

        this._tutorialTween = tween(this.node);
        
        // 1. Loop through the path provided by GoalManager
        for (let i = 1; i < path.length; i++) {
            this.addTweenSegment(path[i-1], path[i], colorHex);
        }

        // 2. NEW: Add a final segment to close the loop back to the start
        const lastPoint = path[path.length - 1];
        const firstPoint = path[0];
        this.addTweenSegment(lastPoint, firstPoint, colorHex);

        // Keep the finished drawing visible for 1.5s then hide
        this._tutorialTween.delay(1.5).call(() => this.stopTutorial()).start();
    }

    /**
     * Helper to add a movement segment to the tutorial tween
     */
    private addTweenSegment(startCoord: Vec2, endCoord: Vec2, colorHex: string) {
        const prevPos = this.grid.getPosOfCell(startCoord.x, startCoord.y);
        const targetPos = this.grid.getPosOfCell(endCoord.x, endCoord.y);

        this._tutorialTween = this._tutorialTween!.to(this.drawSpeed, {}, {
            onUpdate: (target: Node, ratio: number) => {
                const currentPos = v3();
                Vec3.lerp(currentPos, prevPos, targetPos, ratio);
                this.hand.node.setPosition(currentPos);
                
                if (this.grid.lightning) {
                    this.grid.lightning.drawLightning(prevPos, currentPos, colorHex);
                }
            },
            onComplete: () => {
                if (this.grid.lightning) {
                    this.grid.lightning.drawLightning(prevPos, targetPos, colorHex);
                }
            }
        });
    }

    /**
     * Call this to instantly kill the tutorial and reset the idle timer
     */
    public stopTutorial() {
        this._idleTimer = 0; // Reset 3s clock
        this._isShowingTutorial = false;
        
        if (this._tutorialTween) {
            this._tutorialTween.stop();
            this._tutorialTween = null;
        }

        this.hand.hide();
        if (this.grid.lightning) {
            this.lightningWorkaround();
        }
    }

    private lightningWorkaround() {
        // Clear current lightning so it doesn't stay on screen when player starts
        
        this.grid.lightning.clearWeb();
    }
}