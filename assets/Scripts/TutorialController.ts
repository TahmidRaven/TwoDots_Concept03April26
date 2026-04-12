import { _decorator, Component, Node, Vec3, v3, Vec2, tween, Tween, CCFloat } from 'cc';
import { GridController } from './GridController';
import { GameManager } from './GameManager';
import { TutorialHand } from './TutorialHand';

const { ccclass, property } = _decorator;

@ccclass('TutorialController')
export class TutorialController extends Component {
    @property(TutorialHand) hand: TutorialHand = null!;
    @property({ type: GridController }) grid: GridController = null!;
    @property(CCFloat) public drawSpeed: number = 0.4;
    @property(CCFloat) public idleThreshold: number = 3.0;

    private _idleTimer: number = 0;
    private _isShowingTutorial: boolean = false;
    private _tutorialTween: Tween<Node> | null = null;
    
    // Tracks if the full path has been shown for the current stage
    private _hasShownFullTutorialInStage: boolean = false;
    private _lastCheckedStage: number = -1;

    update(dt: number) {
        if (!GameManager.instance || !GameManager.instance.goalManager) return;
        const currentStage = GameManager.instance.goalManager.currentStage;

        // Reset the flag when the stage changes
        if (currentStage !== this._lastCheckedStage) {
            this._hasShownFullTutorialInStage = false;
            this._lastCheckedStage = currentStage;
        }

        if (GameManager.instance.isGameOver || (this.grid && (this.grid.isProcessing || this.grid.isDragging))) {
            this._idleTimer = 0;
            if (this._isShowingTutorial) this.stopTutorial();
            return;
        }

        this._idleTimer += dt;
        if (this._idleTimer >= this.idleThreshold && !this._isShowingTutorial) {
            // Decide which tutorial to play
            if (!this._hasShownFullTutorialInStage) {
                this.playFullSuggestion();
            } else {
                this.playStartPointHint();
            }
        }
    }

    public stopTutorial() {
        this._idleTimer = 0; 
        this._isShowingTutorial = false;
        if (this._tutorialTween) {
            this._tutorialTween.stop();
            this._tutorialTween = null;
        }
        if (this.hand) this.hand.hide();
        if (this.grid && this.grid.lightning) this.grid.lightning.clearWeb();
    }

    /**
     * Shows the entire drawing path once.
     */
    public playFullSuggestion() {
        const gm = GameManager.instance.goalManager;
        const path: Vec2[] = gm.getPathForCurrentStage();
        if (path.length < 2) return;

        gm.flashOutline(1.0); 

        this._isShowingTutorial = true;
        const goalColor = gm.getRequiredColor();
        const colorHex = (this.grid as any).colorMap[goalColor] || "#FFFFFF";

        const startPos = this.grid.getPosOfCell(path[0].x, path[0].y);
        this.hand.showAt(startPos);

        this._tutorialTween = tween(this.node);
        for (let i = 1; i < path.length; i++) {
            this.addTweenSegment(path[i-1], path[i], colorHex);
        }
        // Close the loop
        this.addTweenSegment(path[path.length - 1], path[0], colorHex);

        this._tutorialTween.delay(1.5).call(() => {
            this._hasShownFullTutorialInStage = true; // Mark as shown for this stage
            this.stopTutorial();
        }).start();
    }

    /**
     * Only shows the hand pointing/pulsing at the first dot of the path.
     */
    private playStartPointHint() {
        const gm = GameManager.instance.goalManager;
        const path: Vec2[] = gm.getPathForCurrentStage();
        if (path.length === 0) return;

        this._isShowingTutorial = true;
        
        // Flash the outline briefly to remind them of the shape
        gm.flashOutline(0.8);

        const startPos = this.grid.getPosOfCell(path[0].x, path[0].y);
        this.hand.showAt(startPos);

        // Keep it showing for 3 seconds then hide automatically if user doesn't interact
        this._tutorialTween = tween(this.node)
            .delay(3.0)
            .call(() => this.stopTutorial())
            .start();
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
                    this.grid.lightning.setPreviewBolt(prevPos, currentPos, colorHex);
                }
            },
            onComplete: () => {
                if (this.grid.lightning) {
                    this.grid.lightning.addBolt(prevPos, targetPos, colorHex);
                    this.grid.lightning.clearPreview();
                }
            }
        });
    }
}