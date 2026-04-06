import { _decorator, Component, Node, Vec3, v3, Vec2,tween, Tween } from 'cc';
import { GridController } from './GridController';
import { GameManager } from './GameManager';
import { TutorialHand } from './TutorialHand';

const { ccclass, property } = _decorator;

@ccclass('TutorialController')
export class TutorialController extends Component {
    @property(TutorialHand) hand: TutorialHand = null!;
    @property(GridController) grid: GridController = null!;
    
    private _idleTimer: number = 0;
    private _isShowingTutorial: boolean = false;

    update(dt: number) {
        // Only show tutorial if game is active and not currently processing a match
        if (GameManager.instance.isGameOver || this.grid.isProcessing) {
            this.stopTutorial();
            return;
        }

        this._idleTimer += dt;

        // Trigger after 3 seconds of inactivity
        if (this._idleTimer >= 3.0 && !this._isShowingTutorial) {
            this.playSuggestion();
        }
    }

    public playSuggestion() {
        const gm = GameManager.instance.goalManager;
        const path: Vec2[] = gm.getPathForCurrentStage(); //
        if (path.length < 2) return;

        this._isShowingTutorial = true;
        
        // Use the first 5 points as a hint
        const tutorialPath = path.slice(0, 5);
        const goalColor = gm.getRequiredColor(); //
        
        // Map color name to Hex for lightning
        const colorHex = (this.grid as any).colorMap[goalColor] || "#FFFFFF";

        // Setup initial position
        const startPos = this.grid.getPosOfCell(tutorialPath[0].x, tutorialPath[0].y);
        this.hand.node.setPosition(startPos);
        this.hand.showAt(startPos); //

        let chain = tween(this.node);
        
        for (let i = 1; i < tutorialPath.length; i++) {
            const prevPos = this.grid.getPosOfCell(tutorialPath[i-1].x, tutorialPath[i-1].y);
            const targetPos = this.grid.getPosOfCell(tutorialPath[i].x, tutorialPath[i].y);

            chain = chain.to(0.6, {}, {
                onUpdate: (target: Node, ratio: number) => {
                    const currentPos = v3();
                    Vec3.lerp(currentPos, prevPos, targetPos, ratio);
                    this.hand.node.setPosition(currentPos);
                    
                    // Live drawing of lightning
                    if (this.grid.lightning) {
                        this.grid.lightning.drawLightning(prevPos, currentPos, colorHex);
                    }
                },
                onComplete: () => {
                    // Lock the lightning bolt segment
                    if (this.grid.lightning) {
                        this.grid.lightning.drawLightning(prevPos, targetPos, colorHex);
                    }
                }
            });
        }

        chain.delay(1.5).call(() => this.stopTutorial()).start();
    }

    public stopTutorial() {
        if (!this._isShowingTutorial) return;
        this._isShowingTutorial = false;
        this._idleTimer = 0;
        this.hand.hide(); //
        if (this.grid.lightning) this.grid.lightning.clearWeb(); //
    }
}