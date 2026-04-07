import { _decorator, Component, Node, Prefab, instantiate, UITransform, v3, Vec3, tween, CCInteger, CCFloat } from 'cc';
import { GridPiece } from './GridPiece';
import { GameManager } from './GameManager';
import { LightningEffect } from './LightningEffect';
import { MatchFinder } from './MatchFinder';
import { TutorialHand } from './TutorialHand'; 
import { TutorialController } from './TutorialController';

const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property([Prefab]) dotPrefabs: Prefab[] = [];
    @property(LightningEffect) lightning: LightningEffect = null!;
    @property(TutorialHand) tutorialHand: TutorialHand = null!; 
    @property(CCInteger) rows: number = 9;
    @property(CCInteger) cols: number = 9;
    
    @property(CCFloat) cellSize: number = 55;
    @property(CCFloat) spacingOffset: number = 20;

    @property(Node) 
    public gridContainer: Node = null!;

    private grid: (Node | null)[][] = [];
    public isProcessing: boolean = false; 
    private _currentChain: Node[] = [];
    private _isDragging: boolean = false;
    private _isLoopClosed: boolean = false;

    // Made public so TutorialController can access it
    public readonly colorMap: { [key: string]: string } = {
        "blue": "#7693C0", "yellow": "#FBC367", "purple": "#8F6B9B", "red": "#E35B5B", "green": "#79B496"
    };

    private get spacing(): number {
        return this.cellSize + this.spacingOffset;
    }

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onDragStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onDragEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onDragEnd, this);
    }

    public initGrid() {
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) this.grid[r][c] = null;
        }
        this.spawnBoard();
    }

    /**
     * Converts grid coordinates to local Node position
     */
    public getPosOfCell(r: number, c: number): Vec3 {
        const s = this.spacing;
        const totalW = (this.cols - 1) * s;
        const totalH = (this.rows - 1) * s;
        return v3((c * s) - (totalW / 2), (totalH / 2) - (r * s), 0);
    }

// Inside GridController.ts
private onDragStart(event: any) {
    if (this.isProcessing || GameManager.instance.isGameOver) return;
    
    const tc = this.getComponent('TutorialController') as TutorialController;
    if (tc) {
        // NEW: Check if we are allowed to interrupt
        if (!tc.canPlayerInteract()) {
            return; // Exit here; player cannot touch during the first stage tutorial
        }
        tc.stopTutorial(); 
    }

    if (!GameManager.instance.hasGameStarted) GameManager.instance.startGame();
    this._isDragging = true;
    this.handleTouchStep(event);
}

    private onDragMove(event: any) {
        if (!this._isDragging || this.isProcessing || this._isLoopClosed) return;
        this.handleTouchStep(event);
    }

    private handleTouchStep(event: any) {
        const uiTransform = this.node.getComponent(UITransform)!;
        const localPos = uiTransform.convertToNodeSpaceAR(v3(event.getUILocation().x, event.getUILocation().y, 0));
        
        const s = this.spacing;
        const c = Math.round((localPos.x + ((this.cols - 1) * s / 2)) / s);
        const r = Math.round((((this.rows - 1) * s / 2) - localPos.y) / s);

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            const node = this.grid[r][c];
            if (!node) return;

            if (this._currentChain.length >= 3 && node === this._currentChain[0]) {
                const lastNode = this._currentChain[this._currentChain.length - 1];
                const piece = node.getComponent(GridPiece)!;
                this.lightning.drawLightning(lastNode.position, node.position, this.colorMap[piece.colorId]);
                this._isLoopClosed = true; 
                return;
            }

            if (this._currentChain.indexOf(node) !== -1) return;
            const piece = node.getComponent(GridPiece)!;
            
            if (this._currentChain.length === 0) {
                this._currentChain.push(node);
            } else {
                const lastPiece = this._currentChain[this._currentChain.length - 1].getComponent(GridPiece)!;
                if (MatchFinder.isSameColor(lastPiece, piece)) {
                    const prevPos = this._currentChain[this._currentChain.length - 1].position;
                    this._currentChain.push(node);
                    this.lightning.drawLightning(prevPos, node.position, this.colorMap[piece.colorId]);
                }
            }
        }
    }

    private onDragEnd() {
        this._isDragging = false;
        if (this._currentChain.length >= 3 && GameManager.instance.goalManager.checkPathMatch(this._currentChain)) {
            this.handleSuccess();
        } else {
            this.clearChain();
        }
    }

    private handleSuccess() {
        this.isProcessing = true;
        GameManager.instance.goalManager.revealCurrentDrawing();
        
        this._currentChain.forEach(node => {
            tween(node).to(0.2, { scale: v3(0, 0, 0) }).call(() => node.destroy()).start();
        });

        GameManager.instance.decrementMoves();
        
        this.scheduleOnce(() => {
            if (GameManager.instance.goalManager.currentStage >= 3) {
                GameManager.instance.endGame(true);
            } else {
                this.refreshBoard();
            }
        }, 0.5);
    }

    private refreshBoard() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c]) {
                    this.grid[r][c]!.destroy();
                    this.grid[r][c] = null;
                }
            }
        }
        this.clearChain();
        this.spawnBoard();
    }

    private clearChain() {
        this._currentChain = [];
        this._isLoopClosed = false;
        if (this.lightning) this.lightning.clearWeb();
    }

private spawnBoard() {
    const s = this.spacing;
    const totalW = (this.cols - 1) * s;
    const totalH = (this.rows - 1) * s;

    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            const dot = instantiate(this.getPrefabForCell(r, c));
            
            // CHANGE THIS LINE:
            // Use gridContainer if assigned, otherwise fallback to the controller node
            dot.parent = this.gridContainer || this.node; 
            
            const piece = dot.getComponent(GridPiece)!;
            piece.row = r; piece.col = c;
            
            const finalPos = v3((c * s) - (totalW / 2), (totalH / 2) - (r * s), 0);
            dot.setPosition(finalPos.x, finalPos.y + 600, 0);
            this.grid[r][c] = dot;

            tween(dot).to(0.6, { position: finalPos }, { easing: 'bounceOut' }).start();
        }
    }
    this.scheduleOnce(() => this.isProcessing = false, 0.7);
}

    private getPrefabForCell(r: number, c: number): Prefab {
        const gm = GameManager.instance.goalManager;
        const targetPath = gm.getPathForCurrentStage();
        const goalColor = gm.getRequiredColor();
        const isShapePart = targetPath.some(p => p.x === r && p.y === c);

        if (isShapePart) {
            return this.dotPrefabs.find(p => p.data.getComponent(GridPiece)!.colorId === goalColor) || this.dotPrefabs[0];
        }

        const noisePool = this.dotPrefabs.filter(p => p.data.getComponent(GridPiece)!.colorId !== goalColor);
        return noisePool[Math.floor(Math.random() * noisePool.length)];
    }
}