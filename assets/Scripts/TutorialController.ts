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
    
    private _hasCompletedFirstTutorialInStage: boolean = false;
    private _lastCheckedStage: number = -1;

    update(dt: number) {
        const currentStage = GameManager.instance.goalManager.currentStage;

        if (currentStage !== this._lastCheckedStage) {
            this._hasCompletedFirstTutorialInStage = false;
            this._lastCheckedStage = currentStage;
        }

        // NEW: If the grid is processing (dots falling) or player is dragging, reset the timer
        if (GameManager.instance.isGameOver || this.grid.isProcessing || this.grid.isDragging) {
            this._idleTimer = 0;
            return;
        }

        this._idleTimer += dt;

        if (this._idleTimer >= this.idleThreshold && !this._isShowingTutorial) {
            this.playFullSuggestion();
        }
    }

    /**
     * Resets the idle timer. Called by GridController on touch move.
     */
    public resetIdleTimer() {
        this._idleTimer = 0;
        // If a suggestion is currently showing (and it's not the forced first one), stop it
        if (this._isShowingTutorial && this._hasCompletedFirstTutorialInStage) {
            this.stopTutorial();
        }
    }

    public canPlayerInteract(): boolean {
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

        const startPos = this.grid.getPosOfCell(path[0].x, path[0].y);
        this.hand.node.setPosition(startPos);
        this.hand.showAt(startPos);

        this._tutorialTween = tween(this.node);
        
        for (let i = 1; i < path.length; i++) {
            this.addTweenSegment(path[i-1], path[i], colorHex);
        }

        this.addTweenSegment(path[path.length - 1], path[0], colorHex);

        this._tutorialTween.delay(1.5).call(() => {
            this._hasCompletedFirstTutorialInStage = true; 
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