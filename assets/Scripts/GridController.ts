import { _decorator, Component, Node, Prefab, instantiate, UITransform, v3, tween, CCInteger, CCFloat } from 'cc';
import { GridPiece } from './GridPiece';
import { GameManager } from './GameManager';
import { LightningEffect } from './LightningEffect';
import { MatchFinder } from './MatchFinder';

const { ccclass, property } = _decorator;

@ccclass('GridController')
export class GridController extends Component {
    @property([Prefab]) dotPrefabs: Prefab[] = [];
    @property(LightningEffect) lightning: LightningEffect = null!;
    @property(CCInteger) rows: number = 9;
    @property(CCInteger) cols: number = 9;
    @property(CCFloat) cellSize: number = 55;

    private grid: (Node | null)[][] = [];
    private isProcessing: boolean = false;
    private _currentChain: Node[] = [];
    private _isDragging: boolean = false;
    private _isLoopClosed: boolean = false; // Track if the shape is closed

    private readonly colorMap: { [key: string]: string } = {
        "blue": "#7693C0", "yellow": "#FBC367", "purple": "#8F6B9B", "red": "#E35B5B", "green": "#79B496"
    };

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

    private onDragStart(event: any) {
        if (this.isProcessing || GameManager.instance.isGameOver) return;
        if (!GameManager.instance.hasGameStarted) GameManager.instance.startGame();
        this._isDragging = true;
        this._isLoopClosed = false;
        this.handleTouchStep(event);
    }

    private onDragMove(event: any) {
        if (!this._isDragging || this.isProcessing || this._isLoopClosed) return;
        this.handleTouchStep(event);
    }

    private handleTouchStep(event: any) {
        const uiTransform = this.node.getComponent(UITransform)!;
        const localPos = uiTransform.convertToNodeSpaceAR(v3(event.getUILocation().x, event.getUILocation().y, 0));
        const spacing = this.cellSize + 10;
        
        const c = Math.round((localPos.x + ((this.cols - 1) * spacing / 2)) / spacing);
        const r = Math.round((((this.rows - 1) * spacing / 2) - localPos.y) / spacing);

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            const node = this.grid[r][c];
            if (!node) return;

            // Handle connecting back to the start to close the loop
            if (this._currentChain.length >= 3 && node === this._currentChain[0]) {
                const lastNode = this._currentChain[this._currentChain.length - 1];
                const piece = node.getComponent(GridPiece)!;
                
                this.lightning.drawLightning(lastNode.position, node.position, this.colorMap[piece.colorId]);
                this._isLoopClosed = true; // Stop further dragging once closed
                console.log("Shape loop closed!");
                return;
            }

            // Standard connection logic
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
        // Success check: Must be at least 3 dots, and for shapes, we usually want them closed
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
        const spacing = this.cellSize + 10;
        const totalW = (this.cols - 1) * spacing;
        const totalH = (this.rows - 1) * spacing;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const dot = instantiate(this.getPrefabForCell(r, c));
                dot.parent = this.node;
                
                const piece = dot.getComponent(GridPiece)!;
                piece.row = r; piece.col = c;
                
                const finalPos = v3((c * spacing) - (totalW / 2), (totalH / 2) - (r * spacing), 0);
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