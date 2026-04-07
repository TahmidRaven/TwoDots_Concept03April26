import { _decorator, Component, Graphics, Vec3, Color, isValid, CCFloat } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LightningEffect')
export class LightningEffect extends Component {
    private graphics: Graphics = null!;
    private _activeBolts: { start: Vec3, end: Vec3, colorHex: string }[] = [];
    private _previewBolt: { start: Vec3, end: Vec3, colorHex: string } | null = null;

    @property(CCFloat) public baseLineWidth: number = 20;

    onLoad() {
        this.graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
    }

    public clearWeb() {
        this._activeBolts = [];
        this._previewBolt = null;
        if (this.graphics && isValid(this.graphics)) this.graphics.clear();
    }

    public addBolt(start: Vec3, end: Vec3, colorHex: string) {
        this._activeBolts.push({ start, end, colorHex });
    }

    public setPreviewBolt(start: Vec3, end: Vec3, colorHex: string) {
        this._previewBolt = { start, end, colorHex };
    }

    public clearPreview() {
        this._previewBolt = null;
    }

    protected update(dt: number) {
        if (!this.graphics) return;
        this.graphics.clear();

        for (const bolt of this._activeBolts) {
            this.drawLayers(bolt);
        }

        if (this._previewBolt) {
            this.drawLayers(this._previewBolt);
        }
    }

    private drawLayers(bolt: { start: Vec3, end: Vec3, colorHex: string }) {
        // this.renderLine(bolt.start, bolt.end, bolt.colorHex, this.baseLineWidth * 1.5, 100);
        this.renderLine(bolt.start, bolt.end, bolt.colorHex, this.baseLineWidth, 255);
    }

    private renderLine(start: Vec3, end: Vec3, colorHex: string, width: number, alpha: number) {
        const color = new Color().fromHEX(colorHex);
        color.a = alpha;
        this.graphics.lineJoin = Graphics.LineJoin.ROUND;
        this.graphics.lineCap = Graphics.LineCap.ROUND;
        this.graphics.strokeColor = color;
        this.graphics.lineWidth = width;
        this.graphics.moveTo(start.x, start.y);
        this.graphics.lineTo(end.x, end.y);
        this.graphics.stroke();
    }
}