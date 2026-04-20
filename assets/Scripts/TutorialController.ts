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
    @property(CCFloat) public idleThreshold: number = 0.25; 

    private _idleTimer: number = 0;
    private _isShowingTutorial: boolean = false;
    private _tutorialTween: Tween<Node> | null = null;
    private _lastCheckedStage: number = -1;

    update(dt: number) {
        if (!GameManager.instance || !GameManager.instance.goalManager) return;
        
        // Reset if stage changes
        const currentStage = GameManager.instance.goalManager.currentStage;
        if (currentStage !== this._lastCheckedStage) {
            this._lastCheckedStage = currentStage;
            this.stopTutorial(); 
        }

        // KILL IMMEDIATELY if player touches the grid
        if (this.grid && (this.grid.isDragging || this.grid.isProcessing)) {
            if (this._isShowingTutorial) this.stopTutorial();
            return;
        }

        // Timer logic for the 0.25s break
        if (!this._isShowingTutorial) {
            this._idleTimer += dt;
            if (this._idleTimer >= this.idleThreshold) {
                this.playFullSuggestion();
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

    public playFullSuggestion() {
        const gm = GameManager.instance.goalManager;
        const path = gm.getPathForCurrentStage();
        if (path.length < 2) return;

        this._isShowingTutorial = true;
        this._idleTimer = 0;

        const goalColor = gm.getRequiredColor();
        const colorHex = (this.grid as any).colorMap?.[goalColor] || "#FFFFFF";

        const startPos = this.grid.getPosOfCell(path[0].x, path[0].y);
        this.hand.showAt(startPos);

        this._tutorialTween = tween(this.node);
        
        // Loop through the path coordinates
        for (let i = 1; i < path.length; i++) {
            this.addTweenSegment(path[i-1], path[i], colorHex);
        }
        // Close the shape loop
        this.addTweenSegment(path[path.length - 1], path[0], colorHex);

        // Sequence end: Clear and set flag to false to trigger the 0.25s idle timer
        this._tutorialTween.delay(0.1).call(() => {
            if (this.grid && this.grid.lightning) this.grid.lightning.clearWeb();
            this._isShowingTutorial = false; 
        }).start();
    }

    private addTweenSegment(startCoord: Vec2, endCoord: Vec2, colorHex: string) {
        const prevPos = this.grid.getPosOfCell(startCoord.x, startCoord.y);
        const targetPos = this.grid.getPosOfCell(endCoord.x, endCoord.y);

        this._tutorialTween = this._tutorialTween!.to(this.drawSpeed, {}, {
            onUpdate: (target: Node, ratio: number) => {
                // Secondary safety check for instant removal on interaction
                if (this.grid.isDragging) {
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
                if (this.grid.lightning && this._isShowingTutorial) {
                    this.grid.lightning.addBolt(prevPos, targetPos, colorHex);
                    this.grid.lightning.clearPreview();
                }
            }
        });
    }
}