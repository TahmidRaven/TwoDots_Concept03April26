import { _decorator, Component, Node, Vec3, v3, Vec2, tween, Tween, CCFloat, CCBoolean } from 'cc';
import { GridController } from './GridController';
import { GameManager } from './GameManager';
import { TutorialHand } from './TutorialHand';

const { ccclass, property } = _decorator;

@ccclass('TutorialController')
export class TutorialController extends Component {
    @property(TutorialHand) hand: TutorialHand = null!;
    @property({ type: GridController }) grid: GridController = null!;
    @property(CCFloat) public drawSpeed: number = 0.4;
    @property(CCFloat) public idleThreshold: number = 0.25; 

    @property({ type: CCBoolean, tooltip: "If true, draws the lightning path every time. If false, draws once then only shows hand tap." })
    public showAllTime: boolean = true;

    @property({ 
        type: CCFloat, 
        tooltip: "How long the completed shape stays visible (only used when showAllTime is false)",
        visible: function(this: TutorialController) { return !this.showAllTime; } 
    })
    public showShapeDuration: number = 1.0;

    private _idleTimer: number = 0;
    private _isShowingTutorial: boolean = false;
    private _tutorialTween: Tween<Node> | null = null;
    private _lastCheckedStage: number = -1;
    private _hasDrawnCurrentPath: boolean = false;

    onLoad() {
        // Start with the timer at threshold to trigger tutorial quickly on first load
        this._idleTimer = this.idleThreshold;
    }

    update(dt: number) {
        if (!GameManager.instance || !GameManager.instance.goalManager) return;
        
        const currentStage = GameManager.instance.goalManager.currentStage;
        if (currentStage !== this._lastCheckedStage) {
            this._lastCheckedStage = currentStage;
            this._hasDrawnCurrentPath = false; 
            this._idleTimer = this.idleThreshold;
            this.stopTutorial(); 
        }

        // If player is interacting or grid is moving, kill the tutorial
        if (this.grid && (this.grid.isDragging || this.grid.isProcessing)) {
            if (this._isShowingTutorial || (this.hand && this.hand.node.active)) {
                this.stopTutorial();
            }
            this._idleTimer = 0; 
            return;
        }

        if (!this._isShowingTutorial) {
            this._idleTimer += dt;
            if (this._idleTimer >= this.idleThreshold) {
                this.playTutorialStep();
            }
        }
    }

    public stopTutorial() {
        this._isShowingTutorial = false;
        this._idleTimer = 0; 

        if (this._tutorialTween) {
            this._tutorialTween.stop();
            this._tutorialTween = null;
        }

        if (this.hand && this.hand.node) {
            tween(this.hand.node).stop();
            this.hand.hide();
        }

        if (this.grid && this.grid.lightning) {
            this.grid.lightning.clearWeb();
            this.grid.lightning.clearPreview();
        }
    }

    private playTutorialStep() {
        const gm = GameManager.instance.goalManager;
        if (!gm) return;
        
        const path = gm.getPathForCurrentStage();
        if (path.length < 2) return;

        // Draw full path if "showAllTime" is true OR if we haven't drawn this stage's path yet
        if (this.showAllTime || !this._hasDrawnCurrentPath) {
            this.playFullSuggestion(path);
        } else {
            this.playHandTapOnly(path);
        }
    }

    private playHandTapOnly(path: Vec2[]) {
        this._isShowingTutorial = true;
        this._idleTimer = 0;
        const startPos = this.grid.getPosOfCell(path[0].x, path[0].y);
        this.hand.showAt(startPos);
    }

    public playFullSuggestion(path: Vec2[]) {
        this._isShowingTutorial = true;
        this._idleTimer = 0;

        const goalColor = GameManager.instance.goalManager.getRequiredColor();
        const colorHex = (this.grid as any).colorMap?.[goalColor] || "#FFFFFF";

        const startPos = this.grid.getPosOfCell(path[0].x, path[0].y);
        this.hand.showAt(startPos);

        this._tutorialTween = tween(this.node);
        
        // Build the drawing path
        for (let i = 1; i < path.length; i++) {
            this.addTweenSegment(path[i-1], path[i], colorHex);
        }
        // Close the loop
        this.addTweenSegment(path[path.length - 1], path[0], colorHex);

        // Conditional delay: keep the lines visible before clearing
        if (!this.showAllTime) {
            this._tutorialTween.delay(this.showShapeDuration);
        }

        this._tutorialTween.call(() => {
            if (this.grid && this.grid.lightning) {
                this.grid.lightning.clearWeb();
            }
            this.hand.hide(); 
            this._isShowingTutorial = false; 
            this._hasDrawnCurrentPath = true; 
            this._idleTimer = 0; // Reset idle timer after the hold duration finishes
        }).start();
    }

    private addTweenSegment(startCoord: Vec2, endCoord: Vec2, colorHex: string) {
        const prevPos = this.grid.getPosOfCell(startCoord.x, startCoord.y);
        const targetPos = this.grid.getPosOfCell(endCoord.x, endCoord.y);

        this._tutorialTween = this._tutorialTween!.to(this.drawSpeed, {}, {
            onUpdate: (target: Node, ratio: number) => {
                if (this.grid.isDragging || this.grid.isProcessing) {
                    this.stopTutorial();
                    return;
                }

                const currentPos = v3();
                Vec3.lerp(currentPos, prevPos, targetPos, ratio);
                this.hand.node.setPosition(currentPos);
                if (this.grid.lightning) {
                    this.grid.lightning.setPreviewBolt(prevPos, currentPos, colorHex);
                }
            },
            onComplete: () => {
                if (this.grid && this.grid.lightning && this._isShowingTutorial) {
                    this.grid.lightning.addBolt(prevPos, targetPos, colorHex);
                    this.grid.lightning.clearPreview();
                }
            }
        });
    }
}