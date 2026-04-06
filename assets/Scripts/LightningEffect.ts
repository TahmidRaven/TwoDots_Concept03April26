import { _decorator, Component, Graphics, Vec3, Color, isValid, CCFloat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LightningEffect')
export class LightningEffect extends Component {
    private graphics: Graphics = null!;
    private _activeBolts: { start: Vec3, end: Vec3, colorHex: string }[] = [];
    private _isDrawing: boolean = false;

    @property({
        type: CCFloat,
        tooltip: "The core thickness of the lightning. Glow layers will scale based on this."
    })
    public baseLineWidth: number = 20;

    onLoad() {
        this.graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
    }

    /**
     * Resets the effect and clears the graphics context
     */
    public clearWeb() {
        this._activeBolts = [];
        this._isDrawing = false;
        if (this.graphics && isValid(this.graphics)) this.graphics.clear();
    }

    /**
     * Adds a new bolt to the drawing queue
     */
    public drawLightning(start: Vec3, end: Vec3, colorHex: string = "#FFFFFF") {
        if (!this.graphics) return;
        this._activeBolts.push({ start, end, colorHex });
        this._isDrawing = true;
    }

    protected update(dt: number) {
        if (!this._isDrawing || this._activeBolts.length === 0) return;
        this.graphics.clear();
        
        
        // LAYER 1: OUTER COLORED GLOW (Widest)
        for (const bolt of this._activeBolts) {
            this.renderLine(bolt.start, bolt.end, bolt.colorHex, this.baseLineWidth * 1.25, 150); 
        }

        // LAYER 2: SUBTLE WHITE GLOW
        for (const bolt of this._activeBolts) {
            this.renderLine(bolt.start, bolt.end, bolt.colorHex, this.baseLineWidth * 1.25, 80); 
        }

        // LAYER 3: COLORED CORE (Defined center)
        for (const bolt of this._activeBolts) {
            this.renderLine(bolt.start, bolt.end, bolt.colorHex, this.baseLineWidth, 255); 
        }
    }


    private renderLine(start: Vec3, end: Vec3, colorHex: string, width: number, alpha: number) {
        const color = new Color().fromHEX(colorHex);
        color.a = alpha;

        this.graphics.lineJoin = Graphics.LineJoin.ROUND;
        this.graphics.lineCap = Graphics.LineCap.ROUND;
        this.graphics.strokeColor = color;
        
        // Adjust width slightly for diagonals to maintain visual consistency
        const dist = Vec3.distance(start, end);
        const diagonalFactor = dist > 60 ? 0.8 : 1.0; // Shrink slightly if it's a long diagonal
        this.graphics.lineWidth = width * diagonalFactor;
        
        this.graphics.moveTo(start.x, start.y);
        this.graphics.lineTo(end.x, end.y);
        this.graphics.stroke();
    }
}