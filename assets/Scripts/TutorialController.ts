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
    
    // Tracks if the first tutorial of the current stage has been completed
    private _hasCompletedFirstTutorialInStage: boolean = false;
    private _lastCheckedStage: number = -1;

    update(dt: number) {
        const currentStage = GameManager.instance.goalManager.currentStage;

        // Reset the "First Tutorial" flag if the stage has changed
        if (currentStage !== this._lastCheckedStage) {
            this._hasCompletedFirstTutorialInStage = false;
            this._lastCheckedStage = currentStage;
        }

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

    /**
     * Checks if the player is allowed to interact with the grid right now
     */
    public canPlayerInteract(): boolean {
        // If it's the first tutorial of the stage and it's currently playing, block touch
        if (this._isShowingTutorial && !this._hasCompletedFirstTutorialInStage) {
            return false;
        }
        return true;
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

        // 2. Close the loop back to the start
        this.addTweenSegment(path[path.length - 1], path[0], colorHex);

        // Keep the finished drawing visible for 1.5s then hide
        this._tutorialTween.delay(1.5).call(() => {
            this._hasCompletedFirstTutorialInStage = true; // Mark stage intro as done
            this.stopTutorial();
        }).start();
    }

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

    public stopTutorial() {
        this._idleTimer = 0; 
        this._isShowingTutorial = false;
        
        if (this._tutorialTween) {
            this._tutorialTween.stop();
            this._tutorialTween = null;
        }

        this.hand.hide();
        if (this.grid.lightning) {
            this.grid.lightning.clearWeb();
        }
    }
}